import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client.js";

export default function TradeJournal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({ title: "", content: "" });

  const fetchEntries = useCallback(async () => {
    try {
      const data = await api.getJournalEntries();
      setEntries(data || []);
    } catch (err) {
      console.error("Failed to load journal:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    try {
      if (editingEntry) {
        await api.updateJournalEntry(editingEntry.id, formData);
      } else {
        await api.createJournalEntry(formData);
      }
      await fetchEntries();
      setFormData({ title: "", content: "" });
      setShowForm(false);
      setEditingEntry(null);
    } catch (err) {
      console.error("Failed to save entry:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteJournalEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({ title: entry.title, content: entry.content });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-title"><div className="dot" style={{ background: "var(--purple)" }} />Trade Journal</div>
        <div className="no-data">Loading...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="card-title"><div className="dot" style={{ background: "var(--purple)" }} />Trade Journal</div>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingEntry(null); setFormData({ title: "", content: "" }); }}
          style={{ padding: "4px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer", fontSize: 10 }}
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 12, padding: 12, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)" }}>
          <input
            type="text"
            placeholder="Entry title..."
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            style={{ width: "100%", padding: "8px", marginBottom: 8, fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          />
          <textarea
            placeholder="Write about your trading session, lessons learned, observations..."
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            rows={4}
            style={{ width: "100%", padding: "8px", marginBottom: 8, fontSize: 11, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", resize: "vertical", fontFamily: "var(--font)" }}
          />
          <button
            onClick={handleSave}
            style={{ width: "100%", padding: "8px", background: "var(--purple)", border: "none", borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            {editingEntry ? "Update Entry" : "Save Entry"}
          </button>
        </div>
      )}

      {entries.length === 0 && !showForm ? (
        <div className="no-data">No journal entries yet. Document your trading journey!</div>
      ) : (
        entries.map(entry => (
          <div key={entry.id} style={{ marginBottom: 12, padding: 10, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{entry.title}</div>
                <div style={{ fontSize: 10, color: "var(--muted2)" }}>
                  {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => handleEdit(entry)} style={{ padding: "2px 6px", background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontSize: 10 }}>Edit</button>
                <button onClick={() => handleDelete(entry.id)} style={{ padding: "2px 6px", background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 10 }}>Delete</button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted2)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{entry.content}</div>
          </div>
        ))
      )}
    </div>
  );
}
