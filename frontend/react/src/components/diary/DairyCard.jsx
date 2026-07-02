import { useEffect, useState, useRef } from "react";
import { Box, Typography } from '@mui/material';

const MAX_LINES = 3;

export const  DiaryCard = ({ content }) => {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (!textRef.current) return;

    const el = textRef.current;

    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight);

    const lines = el.scrollHeight / lineHeight;

    setShowToggle(lines > MAX_LINES);
  }, [content]);

  return (
    <Box sx={{ mb: 2, bgcolor: 'transparent' }}>
      {content && (
        <Box>
          <Typography
            ref={textRef}
            sx={{
              fontSize: 15,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: expanded ? 'unset' : MAX_LINES,
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
            }}
          >
            {content}
          </Typography>

          {showToggle && (
            <Typography
              onClick={() => setExpanded((p) => !p)}
              sx={{
                mt: 0.5,
                fontSize: 14,
                color: '#1d9bf0',
                cursor: 'pointer',
                width: 'fit-content',
              }}
            >
              {expanded ? 'See less' : 'See more'}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};
