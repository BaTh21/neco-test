// dashboard/NotesTab.jsx
import { Add as AddIcon, Group as GroupIcon, Notes as NotesIcon } from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Fab,
  Grid,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme, Button
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  createNote, deleteNote, getNotes,
  getSharedNotes,
  leaveSharedNote,
  shareNote,
  toggleArchiveNote, togglePinNote, updateNote
} from '../../services/api';
import NoteCard from '../notes/NoteCard';
import NoteEditor from '../notes/NoteEditor';
import ShareDialog from '../ShareDialog';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import ArchiveIcon from '@mui/icons-material/Archive';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';

const NotesTab = ({ setError, setSuccess }) => {
  const [notes, setNotes] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [editingNote, setEditingNote] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingNote, setSharingNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const { t, i18n } = useTranslation();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get current user from auth context
  const { auth } = useAuth();
  const user = auth.user;

  useEffect(() => {
    loadNotes();
  }, [activeTab]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      if (activeTab === 2) {
        const data = await getSharedNotes();
        setSharedNotes(Array.isArray(data) ? data : []);
      } else {
        const archived = activeTab === 1;
        const data = await getNotes(archived);
        setNotes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      showTimedAlert('error', error.message || t('loading_notes'));
      setNotes([]);
      setSharedNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const showTimedAlert = (type, message, duration = 3000) => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(''), duration);
    } else {
      setError(message);
      setTimeout(() => setError(''), duration);
    }
  };

  const handleSaveNote = async (noteData) => {
    try {
      let result;
      if (editingNote) {
        result = await updateNote(editingNote.id, noteData);
        showTimedAlert('success', t('note_updated') || 'Note updated successfully');
      } else {
        result = await createNote(noteData);
        showTimedAlert('success', t('note_created') || 'Note created successfully');
      }

      setIsEditorOpen(false);
      setEditingNote(null);
      loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      showTimedAlert('error', error.message || t('failed_to_save_note') || 'Failed to save note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId);
      showTimedAlert('success', t('note_deleted') || 'Note deleted successfully');
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      showTimedAlert('error', error.message || t('failed_to_delete_note') || 'Failed to delete note');
    }
  };

  const handleTogglePin = async (noteId) => {
    try {
      await togglePinNote(noteId);
      showTimedAlert('success', t('pin_status_updated') || 'Note pin status updated');
      loadNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
      showTimedAlert('error', error.message || t('failed_to_toggle_pin') || 'Failed to toggle pin');
    }
  };

  const handleToggleArchive = async (noteId) => {
    try {
      await toggleArchiveNote(noteId);
      const action = activeTab === 0 ? t('archived') : t('unarchived') || 'unarchived';
      showTimedAlert('success', `${t('note')} ${action} ${t('successfully')}` || `Note ${action} successfully`);
      loadNotes();
    } catch (error) {
      console.error('Error toggling archive:', error);
      showTimedAlert('error', error.message || t('failed_to_toggle_archive') || 'Failed to toggle archive');
    }
  };

  const handleShareNote = (note) => {
    setSharingNote(note);
    setShareDialogOpen(true);
  };

  const handleShare = async (shareData) => {
    if (!sharingNote) {
      showTimedAlert('error', t('no_note_selected') || 'No note selected for sharing');
      return;
    }

    try {
      await shareNote(sharingNote.id, shareData);

      let successMessage = t('sharing_updated') || 'Sharing settings updated';
      if (shareData.share_type === 'public') {
        successMessage = t('note_now_public') || 'Note is now public';
      } else if (shareData.share_type === 'shared') {
        const count = shareData.friend_ids.length;
        successMessage = count === 1
          ? t('note_shared_singular') || `Note shared with 1 friend`
          : t('note_shared_plural') || `Note shared with ${count} friends`;
      } else {
        successMessage = t('note_now_private') || 'Note is now private';
      }

      showTimedAlert('success', successMessage);
      setShareDialogOpen(false);
      setSharingNote(null);
      loadNotes();
    } catch (error) {
      console.error('Error sharing note:', error);
      showTimedAlert('error', error.message || t('failed_to_share') || 'Failed to update sharing settings');
    }
  };

  const handleLeaveNote = async (noteId) => {
    try {
      await leaveSharedNote(noteId);
      await loadNotes();

      showTimedAlert('success', 'Note has been removed');
    } catch (error) {
      showTimedAlert(
        'error',
        error.response?.data?.detail ||
        'Failed to remove the shared note'
      );
    }
  }

  const filteredNotes = notes.filter(note => {
    if (activeTab === 0) return !note.is_archived;
    if (activeTab === 1) return note.is_archived;
    return true;
  });

  const pinnedNotes = filteredNotes.filter(note => note.is_pinned);
  const otherNotes = filteredNotes.filter(note => !note.is_pinned);

  return (
    <Box
      sx={{
        height: '89vh',
        overflowY: 'auto',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      <Typography variant="h5" gutterBottom fontWeight="600">
        {t('my_notes')}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            minHeight: 32,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: 1,
            },
            borderBottom: 1,
            borderColor: 'divider'
          }}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
        >
          <Tab
            icon={<NoteAltIcon sx={{ fontSize: 22 }} />}
            iconPosition="start"
            label={isMobile ? '' : t('active_notes')}
            sx={{
              fontWeight: 600,
              fontSize: 14,
              minHeight: 36,
              px: 1,
            }}
          />
          <Tab
            icon={<ArchiveIcon sx={{ fontSize: 22 }} />}
            iconPosition="start"
            label={isMobile ? '' : t('archived')}
            sx={{
              fontWeight: 600,
              fontSize: 14,
              minHeight: 36,
              px: 1,
            }}
          />
        </Tabs>


        <Button
          // variant="contained"
          onClick={handleCreateNote}
          sx={{
            borderRadius: '8px',
            minWidth: 0,
            bgcolor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <AddIcon />
          <Typography
            sx={{
              mt: 0.25
            }}
          >
            {isMobile ? '' : 'New Note'}
          </Typography>
        </Button>
      </Box>

      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>{t('loading_notes')}</Typography>
        </Box>
      )}

      {!loading && activeTab === 0 && (
        <>
          {pinnedNotes.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom color="text.secondary">
                {t('pinned')}
              </Typography>
              <Grid container spacing={2}>
                {pinnedNotes.map(note => (
                  <Grid item key={note.id} xs={12} sm={6} md={4} sx={{ mx: { xs: 'auto', md: 0 } }}>
                    <NoteCard
                      note={note}
                      onEdit={handleEditNote}
                      onDelete={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                      onToggleArchive={handleToggleArchive}
                      onShare={handleShareNote}
                      onLeaveNote={handleLeaveNote}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {otherNotes.length > 0 && (
            <Box>
              {pinnedNotes.length > 0 && (
                <Typography variant="h6" gutterBottom color="text.secondary">
                  {t('others')}
                </Typography>
              )}
              <Grid container spacing={2}>
                {otherNotes.map(note => (
                  <Grid item key={note.id} xs={12} sm={6} md={4} sx={{ mx: { xs: 'auto', md: 0 } }}>
                    <NoteCard
                      note={note}
                      onEdit={handleEditNote}
                      onDelete={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                      onToggleArchive={handleToggleArchive}
                      onShare={handleShareNote}
                      onLeaveNote={handleLeaveNote}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {filteredNotes.length === 0 && (
            <Card variant="outlined" sx={{ textAlign: 'center', py: 6, bgcolor: 'transparent', border: 'none', boxShadow: 'none' }}>
              <CardContent>
                <StickyNote2Icon sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('no_notes_yet')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('create_your_first_note')}
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && (activeTab === 1 || activeTab === 2) && (
        <>
          {((activeTab === 1 ? filteredNotes : sharedNotes).length > 0) ? (
            <Grid container spacing={2}>
              {(activeTab === 1 ? filteredNotes : sharedNotes).map(note => (
                <Grid item key={note.id} xs={12} sm={6} md={4} sx={{ mx: { xs: 'auto', md: 0 } }}>
                  <NoteCard
                    note={note}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                    onTogglePin={handleTogglePin}
                    onToggleArchive={handleToggleArchive}
                    onShare={handleShareNote}
                    onLeaveNote={handleLeaveNote}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card variant="outlined" sx={{ textAlign: 'center', py: 6, bgcolor: 'transparent', border: 'none', boxShadow: 'none' }}>
              <CardContent>
                {activeTab === 1 ? (
                  <>
                    <StickyNote2Icon sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {t('no_archived_notes')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('archived_notes_will_appear_here')}
                    </Typography>
                  </>
                ) : (
                  <>
                    <GroupIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {t('no_shared_notes')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('notes_shared_with_you_will_appear_here')}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <NoteEditor
        open={isEditorOpen}
        note={editingNote}
        onSave={handleSaveNote}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(null);
        }}
      />

      <ShareDialog
        open={shareDialogOpen}
        note={sharingNote}
        onClose={() => {
          setShareDialogOpen(false);
          setSharingNote(null);
        }}
        onShare={handleShare}
      />
    </Box>

  );
};

export default NotesTab;