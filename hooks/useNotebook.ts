import { useState, useEffect, useCallback } from 'react';
import type { Collections, SavedItem } from '../types';
import { db, FieldValue } from '../firebase';

const COLLECTIONS_KEY = 'qran_app_collections';
const SYNC_CODE_KEY = 'qran_app_sync_code';

const generateSyncCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let letters = '';
    for (let i = 0; i < 3; i++) {
        letters += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    let numbers = '';
    for (let i = 0; i < 3; i++) {
        numbers += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    return `${letters}${numbers}`;
};

export const useNotebook = () => {
    const [collections, setCollections] = useState<Collections>(() => {
        try {
            const stored = localStorage.getItem(COLLECTIONS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error("Failed to parse collections from localStorage", e);
            return {};
        }
    });
    const [itemToSave, setItemToSave] = useState<SavedItem | null>(null);

    useEffect(() => {
        localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
    }, [collections]);

    const handleSaveItem = useCallback((item: SavedItem) => {
        setItemToSave(item);
    }, []);

    const handleConfirmSave = useCallback((collectionId: string, newCollectionName?: string) => {
        if (!itemToSave) return;

        setCollections(prevCollections => {
            const newCollections = { ...prevCollections };
            let targetCollectionId = collectionId;

            if (newCollectionName) {
                targetCollectionId = `coll_${Date.now()}`;
                newCollections[targetCollectionId] = {
                    id: targetCollectionId,
                    name: newCollectionName,
                    items: [],
                    createdAt: Date.now()
                };
            }

            const collection = newCollections[targetCollectionId];
            if (collection && !collection.items.some(i => i.id === itemToSave.id)) {
                collection.items.unshift(itemToSave);
            }
            
            return newCollections;
        });

        setItemToSave(null);
    }, [itemToSave]);

    const handleDeleteCollection = useCallback((collectionId: string) => {
        if (window.confirm("هل أنت متأكد من حذف هذه المجموعة وكل محتوياتها؟")) {
            setCollections(prev => {
                const newCollections = { ...prev };
                delete newCollections[collectionId];
                return newCollections;
            });
            if(window.location.hash.includes(`/saved/${collectionId}`)) {
                window.location.hash = '#/saved';
            }
        }
    }, []);

    const handleDeleteSavedItem = useCallback((collectionId: string, itemId: string) => {
         setCollections(prev => {
            const newCollections = { ...prev };
            const collection = newCollections[collectionId];
            if (collection) {
                collection.items = collection.items.filter(item => item.id !== itemId);
            }
            return newCollections;
        });
    }, []);
    
    const updateItemNotes = useCallback((collectionId: string, itemId: string, notes: string) => {
        setCollections(prev => {
            const newCollections = { ...prev };
            const collection = newCollections[collectionId];
            if (collection) {
                const itemIndex = collection.items.findIndex(item => item.id === itemId);
                if (itemIndex > -1) {
                    // Create a new item object to ensure reactivity
                    const updatedItem = { ...collection.items[itemIndex], notes };
                    // Create a new items array
                    const updatedItems = [...collection.items];
                    updatedItems[itemIndex] = updatedItem;
                    // Create a new collection object
                    newCollections[collectionId] = { ...collection, items: updatedItems };
                }
            }
            return newCollections;
        });
    }, []);

    const handleExportNotebook = useCallback(async (): Promise<string> => {
        if (Object.keys(collections).length === 0) {
            throw new Error("دفتر التدبر فارغ. لا يوجد شيء لتصديره.");
        }

        const oldCode = localStorage.getItem(SYNC_CODE_KEY);
        if (oldCode) {
            try {
                await db.collection('temp_notebook_sync').doc(oldCode).delete();
            } catch (error) {
                console.warn(`Could not delete old sync document ${oldCode}:`, error);
            }
        }
        
        const newCode = generateSyncCode();
        try {
            await db.collection('temp_notebook_sync').doc(newCode).set({
                data: JSON.stringify(collections),
                createdAt: FieldValue.serverTimestamp()
            });
            localStorage.setItem(SYNC_CODE_KEY, newCode);
            return newCode;
        } catch (error: any) {
            console.error("Error exporting notebook: ", error);
            if (error.code === 'permission-denied') throw new Error("فشل التصدير بسبب الصلاحيات.");
            if (error.code === 'unavailable') throw new Error("الخادم غير متاح. يرجى التحقق من اتصالك بالإنترنت.");
            throw new Error("فشل الاتصال بالخادم.");
        }
    }, [collections]);

    const handleImportNotebook = useCallback(async (code: string): Promise<void> => {
        if (!code || code.trim().length !== 6) {
            throw new Error("الرجاء إدخال كود صالح مكون من 6 أحرف وأرقام.");
        }
        const docRef = db.collection('temp_notebook_sync').doc(code.toUpperCase());
        try {
            const doc = await docRef.get();
            if (!doc.exists) {
                throw new Error("الكود غير صالح أو انتهت صلاحيته.");
            }
            const importedData = JSON.parse(doc.data()?.data);
            
            setCollections(prev => ({ ...prev, ...importedData }));

            await docRef.delete();
        } catch (error: any) {
            console.error("Error importing notebook: ", error);
            if (error instanceof Error && (error.message.includes("الكود غير صالح") || error.message.includes("6 أحرف"))) throw error;
            if (error.code === 'permission-denied') throw new Error("فشل الاستيراد بسبب الصلاحيات.");
            if (error.code === 'unavailable') throw new Error("الخادم غير متاح.");
            throw new Error("فشل استيراد البيانات.");
        }
    }, []);

    return {
        collections,
        itemToSave,
        setItemToSave,
        handleSaveItem,
        handleConfirmSave,
        handleDeleteCollection,
        handleDeleteSavedItem,
        updateItemNotes,
        handleExportNotebook,
        handleImportNotebook
    };
};