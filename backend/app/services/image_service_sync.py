# services/image_service_sync.py
import os
import base64
import uuid
import traceback
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
import mimetypes
import tempfile
from PIL import Image
import imageio
import numpy as np

from app.core.cloudinary import (
    delete_from_cloudinary, 
    extract_public_id_from_url,
    generate_video_thumbnail, 
    upload_to_cloudinary,
    upload_video_to_cloudinary,
)

class ImageServiceSync:
    def __init__(self):
        self.allowed_image_types = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
        self.allowed_video_types = {'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/ogg'}
        self.max_image_size = 10 * 1024 * 1024  # 10MB
        self.max_video_size = 50 * 1024 * 1024  # 50MB
    
    def validate_and_decode_media(self, data_url: str) -> Tuple[bytes, str, str]:
        """Validate and decode base64 media data URL"""
        try:
            if not data_url or ',' not in data_url:
                raise ValueError("Invalid data URL format")
            
            header, encoded = data_url.split(',', 1)
            
            # Extract MIME type
            if ';' in header:
                mime_info = header.split(';')[0]
            else:
                mime_info = header
            
            if ':' not in mime_info:
                raise ValueError("Invalid MIME type format")
            
            mime_type = mime_info.split(':')[1]
            
            # Validate MIME type
            if mime_type.startswith('image/'):
                if mime_type not in self.allowed_image_types:
                    raise ValueError(f"Unsupported image type: {mime_type}. Allowed: {self.allowed_image_types}")
            elif mime_type.startswith('video/'):
                if mime_type not in self.allowed_video_types:
                    raise ValueError(f"Unsupported video type: {mime_type}. Allowed: {self.allowed_video_types}")
            else:
                raise ValueError(f"Unsupported media type: {mime_type}")
            
            # Decode base64
            try:
                media_data = base64.b64decode(encoded)
            except Exception as e:
                raise ValueError(f"Invalid base64 encoding: {str(e)}")
            
            # Validate size
            if mime_type.startswith('image/'):
                if len(media_data) > self.max_image_size:
                    raise ValueError(f"Image too large. Max {self.max_image_size // 1024 // 1024}MB")
            elif mime_type.startswith('video/'):
                if len(media_data) > self.max_video_size:
                    raise ValueError(f"Video too large. Max {self.max_video_size // 1024 // 1024}MB")
            
            media_type = 'video' if mime_type.startswith('video/') else 'image'
            return media_data, mime_type, media_type
            
        except Exception as e:
            raise ValueError(f"Invalid media data: {str(e)}")
    
    def upload_image(self, image_data: bytes, folder: str = "images") -> str:
        """Upload image to Cloudinary"""
        try:
            filename = f"image_{uuid.uuid4().hex[:12]}"
            
            upload_result = upload_to_cloudinary(
                file_content=image_data,
                public_id=filename,
                folder=folder,
                resource_type="image",
                transformation=[
                    {"width": 1920, "height": 1920, "crop": "limit"},
                    {"quality": "auto"},
                    {"format": "auto"}
                ]
            )
            
            if not upload_result or 'secure_url' not in upload_result:
                raise Exception("Upload failed - no URL returned")
            
            return upload_result["secure_url"]
            
        except Exception as e:
            raise Exception(f"Image upload failed: {str(e)}")
        
    def _get_video_thumbnail_from_cloudinary(self, video_url: str) -> Optional[str]:
        """
        Generate a thumbnail URL directly from a Cloudinary video URL using
        the video's public_id. Returns a high-quality JPG thumbnail.
        """
        try:
            # Extract public_id from Cloudinary URL
            public_id = extract_public_id_from_url(video_url)
            if not public_id:
                return None
            
            # Build thumbnail URL with transformation
            # Assumes Cloudinary cloud name is configured in cloudinary.config()
            from cloudinary import CloudinaryImage
            img = CloudinaryImage(public_id)
            thumbnail_url = img.build_url(
                resource_type='video',
                transformation=[
                    {'start_offset': '0'},          # first frame
                    {'width': 640, 'height': 480, 'crop': 'fill'},
                    {'quality': 'auto'},
                    {'fetch_format': 'jpg'}
                ]
            )
            return thumbnail_url
        except Exception as e:
            print(f"Failed to build thumbnail URL: {e}")
            return None
    
    def upload_video(self, video_data: bytes, folder: str = "videos") -> Tuple[str, Optional[str]]:
        """Upload video and return (video_url, thumbnail_url) - thumbnail guaranteed."""
        try:
            upload_result = upload_video_to_cloudinary(video_data, folder)
            video_url = upload_result.get("secure_url")
            thumbnail = upload_result.get("thumbnail_url")
            
            if not thumbnail and video_url:
                thumbnail = self._get_video_thumbnail_from_cloudinary(video_url)
            
            if not thumbnail:
                thumbnail = "https://your-cdn.com/default-video-thumb.jpg"
                print("WARNING: Using default thumbnail placeholder")
            
            return video_url, thumbnail
            
        except Exception as e:
            raise Exception(f"Video upload failed: {str(e)}")
    
    def save_single_media(self, data_url: str, is_diary: bool = True) -> Tuple[str, Optional[str]]:
        """Save single media item with guaranteed thumbnail for videos"""
        try:
            print(f"save_single_media called")
            
            if not data_url:
                raise ValueError("Empty data URL")
            
            # If already a URL (for updates/edits)
            if data_url.startswith(('http://', 'https://')):
                print(f"Already a URL: {data_url[:50]}...")
                
                # Check if it's a video and generate thumbnail
                video_extensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', 'video']
                if any(ext in data_url.lower() for ext in video_extensions):
                    print(f"Existing video URL detected")
                    # Try to get thumbnail using Cloudinary transformation
                    thumbnail = self._get_video_thumbnail_from_cloudinary(data_url)
                    if not thumbnail:
                        # Fallback to generate_video_thumbnail (if it works with URLs)
                        try:
                            thumbnail = generate_video_thumbnail(data_url)
                        except:
                            thumbnail = None
                    print(f"Thumbnail: {'Yes' if thumbnail else 'No'}")
                    return data_url, thumbnail
                else:
                    return data_url, None
            
            # New upload - validate and decode
            media_data, mime_type, media_type = self.validate_and_decode_media(data_url)
            print(f"Media type: {media_type}, Size: {len(media_data) / 1024:.2f} KB")
            
            base_folder = "diaries" if is_diary else "comments"
            
            if media_type == 'image':
                folder = f"{base_folder}/images"
                print(f"Uploading image to {folder}")
                url = self.upload_image(media_data, folder)
                print(f"Image uploaded successfully")
                return url, None
                
            else:  # video
                folder = f"{base_folder}/videos"
                print(f"🎬 Uploading video to {folder}")
                
                video_url, thumbnail = self.upload_video(media_data, folder)
                
                # Ensure thumbnail is a string (not None)
                if not thumbnail:
                    thumbnail = "https://your-cdn.com/default-video-thumb.jpg"
                    print("No thumbnail generated, using default")
                
                print(f"Video uploaded: {video_url}")
                print(f"Thumbnail: {thumbnail[:80]}...")
                return video_url, thumbnail
                
        except Exception as e:
            print(f"Error in save_single_media: {str(e)}")
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to save media: {str(e)}"
            )
    
    def save_multiple_images(self, images_data: List[str], is_diary: bool = True) -> List[str]:
        """Save multiple images"""
        saved_urls = []
        for i, img_data in enumerate(images_data):
            if img_data:
                try:
                    url, _ = self.save_single_media(img_data, is_diary)
                    if url:
                        saved_urls.append(url)
                        print(f"Saved image {i+1}/{len(images_data)}")
                except Exception as e:
                    print(f"⚠️ Failed to save image {i+1}: {e}")
                    continue
        return saved_urls
    
    def save_multiple_videos(self, videos_data: List[str], is_diary: bool = True) -> Tuple[List[str], List[Optional[str]]]:
        """Save multiple videos - PROCESS ONE BY ONE"""
        print(f"Processing {len(videos_data)} videos individually")
        
        saved_urls = []
        thumbnails = []
        
        for idx, vid_data in enumerate(videos_data):
            if not vid_data:
                continue
                
            try:
                print(f"  Processing video {idx + 1}/{len(videos_data)}")
                url, thumbnail = self.save_single_media(vid_data, is_diary)
                
                if url:
                    saved_urls.append(url)
                    thumbnails.append(thumbnail)
                    print(f"Video {idx + 1} success")
                else:
                    print(f"Video {idx + 1} returned no URL")
                    
            except Exception as e:
                print(f"Video {idx + 1} failed: {str(e)}")
                continue
        
        # Ensure arrays match length
        while len(thumbnails) < len(saved_urls):
            thumbnails.append(None)
        
        print(f"Completed: {len(saved_urls)} videos, {len([t for t in thumbnails if t])} thumbnails")
        return saved_urls, thumbnails
    
    def delete_media(self, media_url: str) -> bool:
        """Delete media from Cloudinary"""
        try:
            if not media_url or not media_url.startswith(('http://', 'https://')):
                return False
            
            public_id = extract_public_id_from_url(media_url)
            if not public_id:
                return False
            
            # Determine resource type
            if 'video' in media_url.lower() or any(ext in media_url for ext in ['.mp4', '.mov', '.avi']):
                resource_type = "video"
            else:
                resource_type = "image"
            
            return delete_from_cloudinary(public_id, resource_type=resource_type)
            
        except Exception as e:
            print(f"Failed to delete media: {e}")
            return False
    
    def cleanup_media(self, media_urls: List[str]):
        """Clean up multiple media files"""
        if not media_urls:
            return
            
        for url in media_urls:
            if url:
                try:
                    public_id = extract_public_id_from_url(url)
                    if public_id:
                        if 'video' in url.lower():
                            delete_from_cloudinary(public_id, resource_type="video")
                        else:
                            delete_from_cloudinary(public_id, resource_type="image")
                except Exception:
                    pass

# Global instance
image_service_sync = ImageServiceSync()