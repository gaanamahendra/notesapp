import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getUrl, uploadData } from 'aws-amplify/storage';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import config from '../amplify_outputs.json';
import './App.css';

Amplify.configure(config);
const client = generateClient();

function App() {
  const [notes, setNotes] = useState([]);
  const [noteData, setNoteData] = useState({
    name: '',
    description: '',
    image: null,
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data } = await client.models.Note.list();
    const notesWithUrls = await Promise.all(
      data.map(async (note) => {
        if (!note.image) return note;
        const { url } = await getUrl({ key: note.image });
        return { ...note, imageUrl: url };
      })
    );
    setNotes(notesWithUrls);
  }

  async function createNote() {
    if (!noteData.name || !noteData.description) return;

    let imageKey;
    if (noteData.image) {
      const fileName = `${Date.now()}_${noteData.image.name}`;
      const result = await uploadData({
        key: fileName,
        data: noteData.image,
      }).result;
      imageKey = result.key;
    }

    await client.models.Note.create({
      name: noteData.name,
      description: noteData.description,
      image: imageKey,
    });

    setNoteData({ name: '', description: '', image: null });
    fetchNotes();
  }

  async function deleteNote(id) {
    await client.models.Note.delete({ id });
    fetchNotes();
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main className="App">
          <h1>Hello, {user.username} 👋</h1>
          <button onClick={signOut}>Sign out</button>

          <h2>Create a new note</h2>
          <input
            placeholder="Note name"
            value={noteData.name}
            onChange={(e) => setNoteData({ ...noteData, name: e.target.value })}
          />
          <input
            placeholder="Description"
            value={noteData.description}
            onChange={(e) =>
              setNoteData({ ...noteData, description: e.target.value })
            }
          />
          <input
            type="file"
            onChange={(e) =>
              setNoteData({ ...noteData, image: e.target.files[0] })
            }
          />
          <button onClick={createNote}>Create Note</button>

          <h2>My Notes</h2>
          <div className="notes-container">
            {notes.map((note) => (
              <div key={note.id} className="note">
                <h3>{note.name}</h3>
                <p>{note.description}</p>
                {note.imageUrl && (
                  <img
                    src={note.imageUrl}
                    alt={note.name}
                    style={{ width: 200 }}
                  />
                )}
                <button onClick={() => deleteNote(note.id)}>Delete</button>
              </div>
            ))}
          </div>
        </main>
      )}
    </Authenticator>
  );
}

export default App;
