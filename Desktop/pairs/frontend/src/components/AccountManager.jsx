import React, { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = 'sweep_accounts';

export default function AccountManager({ onAccountChange, currentAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    broker: '',
    apiKey: '',
    apiSecret: '',
    accountId: '',
    active: true
  });

  const BROKERS = [
    { id: 'deriv', name: 'Deriv' },
    { id: 'oanda', name: 'OANDA' },
    { id: 'icmarkets', name: 'IC Markets' },
    { id: 'fxcm', name: 'FXCM' },
    { id: 'other', name: 'Other' },
  ];

  const loadAccounts = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : [];
      setAccounts(data);
      if (data.length > 0 && !currentAccount) {
        const active = data.find(a => a.active) || data[0];
        onAccountChange?.(active);
      }
    } catch (e) {
      console.error("Failed to load accounts:", e);
      setAccounts([]);
    }
  }, [onAccountChange, currentAccount]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const saveAccounts = (newAccounts) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts));
    setAccounts(newAccounts);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    let newAccounts;
    if (editingAccount) {
      newAccounts = accounts.map(a => 
        a.id === editingAccount.id ? { ...formData, id: editingAccount.id } : a
      );
    } else {
      const newAccount = {
        ...formData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      newAccounts = [...accounts, newAccount];
    }

    saveAccounts(newAccounts);
    resetForm();
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this account?")) return;
    const newAccounts = accounts.filter(a => a.id !== id);
    saveAccounts(newAccounts);
    if (currentAccount?.id === id) {
      onAccountChange?.(newAccounts[0] || null);
    }
  };

  const handleSetActive = (account) => {
    const newAccounts = accounts.map(a => ({
      ...a,
      active: a.id === account.id
    }));
    saveAccounts(newAccounts);
    onAccountChange?.(account);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(accounts, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sweep_accounts_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result);
        if (Array.isArray(imported)) {
          saveAccounts([...accounts, ...imported]);
        }
      } catch (err) {
        console.error("Failed to import accounts:", err);
      }
    };
    reader.readAsText(file);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      broker: '',
      apiKey: '',
      apiSecret: '',
      accountId: '',
      active: true
    });
    setEditingAccount(null);
  };

  const handleEdit = (account) => {
    setFormData(account);
    setEditingAccount(account);
    setShowForm(true);
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="card-title">
          <div className="dot" style={{ background: "var(--blue)" }} />
          Accounts
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button 
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            style={{ padding: "4px 8px", fontSize: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer" }}
          >
            {showForm ? "Cancel" : "+ Add"}
          </button>
          {accounts.length > 0 && (
            <>
              <button 
                onClick={handleExport}
                style={{ padding: "4px 8px", fontSize: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer" }}
              >
                Export
              </button>
              <label style={{ padding: "4px 8px", fontSize: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer" }}>
                Import
                <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
              </label>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ padding: 12, background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Account Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            style={{ width: "100%", padding: "8px", marginBottom: 8, fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          />
          <select
            value={formData.broker}
            onChange={(e) => setFormData(prev => ({ ...prev, broker: e.target.value }))}
            style={{ width: "100%", padding: "8px", marginBottom: 8, fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          >
            <option value="">Select Broker</option>
            {BROKERS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input
            type="password"
            placeholder="API Key"
            value={formData.apiKey}
            onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
            style={{ width: "100%", padding: "8px", marginBottom: 8, fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          />
          <input
            type="password"
            placeholder="API Secret (optional)"
            value={formData.apiSecret}
            onChange={(e) => setFormData(prev => ({ ...prev, apiSecret: e.target.value }))}
            style={{ width: "100%", padding: "8px", marginBottom: 8, fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          />
          <input
            type="text"
            placeholder="Account ID (optional)"
            value={formData.accountId}
            onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
            style={{ width: "100%", padding: "8px", marginBottom: 8, fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }}
          />
          <button
            onClick={handleSubmit}
            style={{ width: "100%", padding: "8px", background: "var(--green)", border: "none", borderRadius: 4, color: "#000", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {editingAccount ? "Update Account" : "Add Account"}
          </button>
        </div>
      )}

      {accounts.length === 0 && !showForm ? (
        <div className="no-data">No accounts configured. Add your broker account to track multiple accounts.</div>
      ) : (
        accounts.map(account => (
          <div 
            key={account.id} 
            style={{ 
              padding: 10, 
              marginBottom: 8, 
              background: account.active ? "rgba(0,217,139,0.1)" : "var(--bg3)", 
              borderRadius: 6, 
              border: `1px solid ${account.active ? "var(--green)" : "var(--border)"}`
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                  {account.name}
                  {account.active && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--green)", background: "rgba(0,217,139,0.2)", padding: "2px 4px", borderRadius: 3 }}>ACTIVE</span>}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted2)" }}>
                  {BROKERS.find(b => b.id === account.broker)?.name || account.broker}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {!account.active && (
                  <button 
                    onClick={() => handleSetActive(account)}
                    style={{ padding: "2px 6px", fontSize: 9, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, color: "var(--muted2)", cursor: "pointer" }}
                  >
                    Set Active
                  </button>
                )}
                <button 
                  onClick={() => handleEdit(account)}
                  style={{ padding: "2px 6px", fontSize: 9, background: "none", border: "none", color: "var(--blue)", cursor: "pointer" }}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(account.id)}
                  style={{ padding: "2px 6px", fontSize: 9, background: "none", border: "none", color: "var(--red)", cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
