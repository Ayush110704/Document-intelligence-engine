import { useState, useEffect } from 'react';

const STORAGE_KEY = 'docflow_documents';
 
const readFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to read documents from localStorage:', e);
    return [];
  }
};

export const useDocuments = () => {
  const [documents, setDocuments] = useState(() => readFromStorage());
 
  useEffect(() => {
    setDocuments(readFromStorage());
  }, []);
 
  useEffect(() => {
    const refresh = () => setDocuments(readFromStorage());

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    const handleCustom = () => refresh();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('documentsUpdated', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('documentsUpdated', handleCustom);
    };
  }, []);

  const persist = (docs) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch (err) {
      console.error('Failed to persist documents:', err);
    }
    setDocuments(docs); 
    window.dispatchEvent(new CustomEvent('documentsUpdated'));
  };

  const addDocument = (doc) => {
    const current = readFromStorage();
    const newDoc = {
      id: `DOC-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      fileName: doc.fileName || 'untitled',
      fileSize: doc.fileSize || 0,
      fileType: doc.fileType || 'Unknown',
      docType: doc.docType || 'Unknown',
      status: doc.status || 'Pending',
      fields: doc.fields || null,
      confidence: doc.confidence ?? null,
      dataUrl: doc.dataUrl || null, // <-- raw bytes for preview + drag
      ...doc,
    };
    persist([newDoc, ...current]);
    return newDoc;
  };

  const updateDocument = (id, updates) => {
    const current = readFromStorage();
    const updated = current.map((d) =>
      d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
    );
    persist(updated);
  };

  const removeDocument = (id) => {
    const current = readFromStorage();
    persist(current.filter((d) => d.id !== id));
  };

  const clearAll = () => persist([]);

  return { documents, addDocument, updateDocument, removeDocument, clearAll };
};