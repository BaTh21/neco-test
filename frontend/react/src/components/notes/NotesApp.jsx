import { Add as AddIcon } from '@mui/icons-material';
import {
    Box,
    Container,
    Fab,
    Grid,
    Tab,
    Tabs,
    Typography,
    useTheme
} from '@mui/material';
import { useEffect, useState } from 'react';
import { createNote, deleteNote, getNotes, toggleArchiveNote, togglePinNote, updateNote } from '../../services/api';
import NoteCard from './NoteCard';

const NotesApp = () => {
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [editingNote, setEditingNote] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    loadNotes();
  }, [activeTab]);

  const loadNotes = async () => {
    try {
      const archived = activeTab === 1;
      const data = await getNotes(archived);
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
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

  const handleSaveNote = async (noteData) => {
    try {
      if (editingNote) {
        await updateNote(editingNote.id, noteData);
      } else {
        await createNote(noteData);
      }
      setIsEditorOpen(false);
      setEditingNote(null);
      loadNotes();
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId);
      loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleTogglePin = async (noteId) => {
    try {
      await togglePinNote(noteId);
      loadNotes();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleToggleArchive = async (noteId) => {
    try {
      await toggleArchiveNote(noteId);
      loadNotes();
    } catch (error) {
      console.error('Failed to toggle archive:', error);
    }
  };

  const pinnedNotes = notes.filter(note => note.is_pinned && !note.is_archived);
  const otherNotes = notes.filter(note => !note.is_pinned && !note.is_archived);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="600">
        Notes
      </Typography>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="All Notes" />
        <Tab label="Archived" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {pinnedNotes.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom color="text.secondary">
                PINNED
              </Typography>
              <Grid container spacing={2}>
                {pinnedNotes.map(note => (
                  <Grid item xs={12} sm={6} md={4} key={note.id}>
                    <NoteCard
                      note={note}
                      onEdit={handleEditNote}
                      onDelete={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                      onToggleArchive={handleToggleArchive}
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
                  OTHERS
                </Typography>
              )}
              <Grid container spacing={2}>
                {otherNotes.map(note => (
                  <Grid item xs={12} sm={6} md={4} key={note.id}>
                    <NoteCard
                      note={note}
                      onEdit={handleEditNote}
                      onDelete={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                      onToggleArchive={handleToggleArchive}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {notes.length === 0 && (
            <Box textAlign="center" py={10}>
              <Typography variant="h6" color="text.secondary">
                No notes yet. Create your first note!
              </Typography>
            </Box>
          )}
        </>
      )}

      {activeTab === 1 && (
        <Grid container spacing={2}>
          {notes.map(note => (
            <Grid item xs={12} sm={6} md={4} key={note.id}>
              <NoteCard
                note={note}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                onTogglePin={handleTogglePin}
                onToggleArchive={handleToggleArchive}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Fab
        color="primary"
        aria-label="add note"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
        onClick={handleCreateNote}
      >
        <AddIcon />
      </Fab>

      <NoteEditor
        open={isEditorOpen}
        note={editingNote}
        onSave={handleSaveNote}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(null);
        }}
      />
    </Container>
  );
};

export default NotesApp;