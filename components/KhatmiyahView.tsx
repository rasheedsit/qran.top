import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { SpinnerIcon, UsersIcon, PlusIcon, CopyIcon, CheckIcon, ClearIcon, TrashIcon, ShieldCheckIcon } from './icons';

// --- Types ---
interface JuzStatus {
    status: 'available' | 'reserved' | 'completed';
    by?: string;
    reservedAt?: any; // Firestore Timestamp
    completedAt?: any; // Firestore Timestamp
}

interface Khatmah {
    id: string;
    name: string;
    createdAt: any; // Firestore Timestamp
    juz_status: { [key: number]: JuzStatus };
    visibility: 'public' | 'private';
}

interface KhatmahHistoryItem {
    id: string;
    name: string;
}

const KHATMIYAH_HISTORY_KEY = 'qran_khatmiyah_history';
const KHATMIYAH_ACTION_TRACKER_KEY = 'qran_khatmiyah_actions_v1';

// --- Helper Functions ---
const generateKhatmahId = (): string => {
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

// Anti-spam helper functions
const getActionTracker = () => {
    const today = new Date().toISOString().split('T')[0];
    try {
        const stored = localStorage.getItem(KHATMIYAH_ACTION_TRACKER_KEY);
        if (stored) {
            const tracker = JSON.parse(stored);
            if (tracker.date === today) {
                return tracker;
            }
        }
    } catch (e) { console.error("Could not parse action tracker", e); }
    // If no tracker, or it's for a previous day, reset it
    return { date: today, creations: 0, reservations: 0, completions: 0 };
};

const checkActionLimit = (actionType: 'creations' | 'reservations' | 'completions'): boolean => {
    const tracker = getActionTracker();
    const limits = { creations: 1, reservations: 10, completions: 10 };
    
    if (tracker[actionType] >= limits[actionType]) {
        alert(`لقد وصلت إلى الحد الأقصى المسموح به لهذا الإجراء اليوم (${limits[actionType]}). يرجى المحاولة غداً.`);
        return false;
    }
    return true;
};

const incrementActionCount = (actionType: 'creations' | 'reservations' | 'completions') => {
    const tracker = getActionTracker();
    tracker[actionType] += 1;
    localStorage.setItem(KHATMIYAH_ACTION_TRACKER_KEY, JSON.stringify(tracker));
};

const deleteInactiveKhatmahs = async (khatmahs: Khatmah[]) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const tenDaysAgo = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000));
    const batch = db.batch();
    const idsToDelete = new Set<string>();

    khatmahs.forEach(khatmah => {
        if (!khatmah.createdAt?.toDate) return;
        const createdAt = khatmah.createdAt.toDate();

        // Rule 1: Delete any Khatmah older than 10 days, regardless of activity.
        if (createdAt < tenDaysAgo) {
            idsToDelete.add(khatmah.id);
            console.log(`Scheduling deletion for >10-day-old Khatmah: ${khatmah.id}`);
            return; // No need to check the second rule if it's already marked for deletion.
        }

        // Rule 2: Delete inactive Khatmah older than 24 hours.
        const hasActivity = Object.values(khatmah.juz_status).some(j => j.status !== 'available');
        if (!hasActivity && createdAt < twentyFourHoursAgo) {
            idsToDelete.add(khatmah.id);
            console.log(`Scheduling deletion for inactive (>24h) Khatmah: ${khatmah.id}`);
        }
    });

    idsToDelete.forEach(id => {
        const docRef = db.collection('khatmahs').doc(id);
        batch.delete(docRef);
    });

    if (idsToDelete.size > 0) {
        try {
            await batch.commit();
            console.log(`Successfully deleted ${idsToDelete.size} Khatmahs.`);
        } catch (error) {
            console.error("Error deleting inactive Khatmahs:", error);
        }
    }
};


// --- Main Component ---
interface KhatmiyahViewProps {
    khatmiyahId: string | null;
}

const KhatmiyahView: React.FC<KhatmiyahViewProps> = ({ khatmiyahId }) => {
    const [khatmah, setKhatmah] = useState<Khatmah | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<'create' | 'join' | 'reserve' | null>(null);
    const [activeJuz, setActiveJuz] = useState<number | null>(null);
    const [updatingJuz, setUpdatingJuz] = useState<number | null>(null);
    
    const [publicKhatmahs, setPublicKhatmahs] = useState<Khatmah[]>([]);
    const [loadingPublic, setLoadingPublic] = useState(true);

    const [history, setHistory] = useState<KhatmahHistoryItem[]>(() => {
        try {
            const stored = localStorage.getItem(KHATMIYAH_HISTORY_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const addKhatmahToHistory = useCallback((khatmahToAdd: KhatmahHistoryItem) => {
        setHistory(prev => {
            const existing = prev.find(h => h.id === khatmahToAdd.id);
            const filtered = prev.filter(h => h.id !== khatmahToAdd.id);
            const updatedHistory = [{... (existing || {}), ...khatmahToAdd}, ...filtered];
            
            if (updatedHistory.length > 20) {
                updatedHistory.pop();
            }

            localStorage.setItem(KHATMIYAH_HISTORY_KEY, JSON.stringify(updatedHistory));
            return updatedHistory;
        });
    }, []);

    const removeKhatmahFromHistory = useCallback((idToRemove: string) => {
        if (window.confirm("هل تريد إزالة هذه الختمة من قائمتك؟ لن يتم حذف الختمة نفسها.")) {
            setHistory(prev => {
                const newHistory = prev.filter(h => h.id !== idToRemove);
                localStorage.setItem(KHATMIYAH_HISTORY_KEY, JSON.stringify(newHistory));
                return newHistory;
            });
        }
    }, []);

    // Fetch public Khatmahs for the home view
    useEffect(() => {
        if (khatmiyahId) {
            setLoadingPublic(false);
            return;
        }

        setLoadingPublic(true);
        const unsubscribe = db.collection('khatmahs')
            .orderBy('createdAt', 'desc')
            .limit(30)
            .onSnapshot(snapshot => {
                const allRecent = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Khatmah));
                const publicOnly = allRecent.filter(k => k.visibility === 'public');
                setPublicKhatmahs(publicOnly);
                deleteInactiveKhatmahs(allRecent); // Run cleanup
                setLoadingPublic(false);
            }, err => {
                console.error("Error fetching public khatmahs:", err);
                setError("فشل في تحميل الختمات العامة.");
                setLoadingPublic(false);
            });

        return () => unsubscribe();
    }, [khatmiyahId]);


    // Fetch specific Khatmah data
    useEffect(() => {
        if (!khatmiyahId) {
            setLoading(false);
            setError(null);
            setKhatmah(null);
            return;
        }

        setLoading(true);
        const unsubscribe = db.collection('khatmahs').doc(khatmiyahId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data() as Omit<Khatmah, 'id'>;
                    const loadedKhatmah = { id: doc.id, ...data };
                    setKhatmah(loadedKhatmah);
                    addKhatmahToHistory({ id: loadedKhatmah.id, name: loadedKhatmah.name });
                    setError(null);
                } else {
                    setError(`الختمة بالمعرف "${khatmiyahId}" غير موجودة. تأكد من صحة الرابط أو الكود.`);
                    setKhatmah(null);
                }
                setLoading(false);
            }, err => {
                console.error("Error fetching Khatmah:", err);
                setError("حدث خطأ أثناء تحميل بيانات الختمة.");
                setLoading(false);
            });

        return () => unsubscribe();
    }, [khatmiyahId, addKhatmahToHistory]);

    // --- Event Handlers ---
    const handleCreateKhatmah = async (name: string, visibility: 'public' | 'private') => {
        if (!checkActionLimit('creations')) {
            throw new Error("Creation limit reached.");
        }

        const initialJuzStatus: { [key: number]: JuzStatus } = {};
        for (let i = 1; i <= 30; i++) {
            initialJuzStatus[i] = { status: 'available' };
        }
        
        let newId = '';
        let docExists = true;
        let attempts = 0;

        while(docExists && attempts < 10) {
            newId = generateKhatmahId();
            const docRef = db.collection('khatmahs').doc(newId);
            const docSnap = await docRef.get();
            docExists = docSnap.exists;
            attempts++;
        }

        if (docExists) {
            alert("فشل في إنشاء معرف فريد للختمة، يرجى المحاولة مرة أخرى.");
            throw new Error("Could not generate a unique ID.");
        }

        try {
            await db.collection('khatmahs').doc(newId).set({
                name: name,
                visibility: visibility,
                createdAt: new Date(),
                juz_status: initialJuzStatus
            });
            
            incrementActionCount('creations');
            addKhatmahToHistory({id: newId, name});
            window.location.hash = `#/khatmiyah/${newId}`;
            setModal(null);
        } catch (err) {
            console.error("Error creating Khatmah:", err);
            alert("فشل إنشاء الختمة. يرجى المحاولة مرة أخرى.");
            throw err;
        }
    };

    const handleJoinKhatmah = (id: string) => {
        if (id.trim()) {
            window.location.hash = `#/khatmiyah/${id.trim()}`;
            setModal(null);
        }
    }

    const handleJuzClick = (juzNumber: number, status: JuzStatus) => {
        if (updatingJuz) return;

        if (status.status === 'available') {
            setActiveJuz(juzNumber);
            setModal('reserve');
        } else if (status.status === 'reserved') {
            if (window.confirm(`هل تريد تأكيد إتمام قراءة الجزء ${juzNumber}؟`)) {
                handleCompleteJuz(juzNumber);
            }
        }
    };

    const handleReserveJuz = async (juzNumber: number, name: string) => {
        if (!khatmiyahId || !name.trim()) return;

        if (!checkActionLimit('reservations')) {
            throw new Error("Reservation limit reached.");
        }
        
        setUpdatingJuz(juzNumber);
        const docRef = db.collection('khatmahs').doc(khatmiyahId);

        try {
            await db.runTransaction(async (transaction: any) => {
                const doc = await transaction.get(docRef);
                if (!doc.exists) throw new Error("Document does not exist!");
                
                const currentJuzStatus = doc.data().juz_status[juzNumber];
                if (currentJuzStatus.status !== 'available') {
                    throw new Error("This Juz has already been reserved.");
                }

                transaction.update(docRef, { 
                    [`juz_status.${juzNumber}`]: {
                        status: 'reserved',
                        by: name.trim(),
                        reservedAt: new Date()
                    }
                });
            });
            
            incrementActionCount('reservations');
            setModal(null);
            setActiveJuz(null);
        } catch (err) {
            console.error("Error reserving Juz:", err);
            if (!(err instanceof Error && err.message === "Reservation limit reached.")) {
                alert("فشل حجز الجزء. قد يكون شخص آخر قد حجزه قبلك.");
            }
            throw err;
        } finally {
            setUpdatingJuz(null);
        }
    };

    const handleCompleteJuz = async (juzNumber: number) => {
        if (!khatmiyahId) return;

        if (!checkActionLimit('completions')) {
            return;
        }

        setUpdatingJuz(juzNumber);
        const docRef = db.collection('khatmahs').doc(khatmiyahId);
        
        try {
            await db.runTransaction(async (transaction: any) => {
                 const doc = await transaction.get(docRef);
                if (!doc.exists) throw new Error("Document does not exist!");

                const currentStatus = doc.data().juz_status[juzNumber];
                if (currentStatus.status !== 'reserved') return;

                transaction.update(docRef, {
                    [`juz_status.${juzNumber}`]: {
                        ...currentStatus,
                        status: 'completed',
                        completedAt: new Date()
                    }
                });
            });
            incrementActionCount('completions');
        } catch (err) {
            console.error("Error completing Juz:", err);
            alert("فشل تحديث حالة الجزء.");
        } finally {
            setUpdatingJuz(null);
        }
    };

    const handleUnreserveJuz = async (juzNumber: number) => {
         if (!khatmiyahId) return;
         if (window.confirm("هل أنت متأكد من إلغاء حجز هذا الجزء؟ سيصبح متاحاً للجميع مرة أخرى.")) {
             setUpdatingJuz(juzNumber);
             const docRef = db.collection('khatmahs').doc(khatmiyahId);
             try {
                await docRef.update({
                    [`juz_status.${juzNumber}`]: { status: 'available' }
                });
             } catch (err) {
                 console.error("Error un-reserving Juz:", err);
                 alert("فشل إلغاء حجز الجزء.");
             } finally {
                 setUpdatingJuz(null);
             }
         }
    };

    if (loading || loadingPublic) {
        return <div className="flex justify-center items-center h-64"><SpinnerIcon className="w-12 h-12 text-green-600" /></div>;
    }

    if (!khatmiyahId) {
        return <HomeView 
            onCreate={() => setModal('create')} 
            onJoin={() => setModal('join')} 
            history={history}
            publicKhatmahs={publicKhatmahs}
            loadingPublic={loadingPublic}
            onRemoveFromHistory={removeKhatmahFromHistory}
            modal={(modal === 'create' || modal === 'join') ? modal : null} 
            setModal={setModal} 
            handleCreate={handleCreateKhatmah} 
            handleJoin={handleJoinKhatmah} 
        />;
    }

    if (error) {
        return <div className="text-center p-10 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg max-w-2xl mx-auto">{error}</div>;
    }

    if (khatmah) {
        return (
            <>
                <KhatmahDashboard khatmah={khatmah} onJuzClick={handleJuzClick} onUnreserve={handleUnreserveJuz} updatingJuz={updatingJuz} />
                {modal === 'reserve' && activeJuz && (
                    <ReserveModal
                        juzNumber={activeJuz}
                        onClose={() => setModal(null)}
                        onReserve={handleReserveJuz}
                    />
                )}
            </>
        );
    }

    return null;
};

// --- Sub-components ---

const HomeView: React.FC<{
    onCreate: () => void;
    onJoin: () => void;
    history: KhatmahHistoryItem[];
    publicKhatmahs: Khatmah[];
    loadingPublic: boolean;
    onRemoveFromHistory: (id: string) => void;
    modal: 'create' | 'join' | null;
    setModal: (m: null | 'create' | 'join') => void;
    handleCreate: (name: string, visibility: 'public' | 'private') => Promise<void>;
    handleJoin: (id: string) => void;
}> = ({ onCreate, onJoin, history, publicKhatmahs, loadingPublic, onRemoveFromHistory, modal, setModal, handleCreate, handleJoin }) => (
    <div className="animate-fade-in w-full max-w-5xl mx-auto px-4">
        
        <div className="space-y-8">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border-r-4 border-yellow-400 p-4 rounded-l-lg mb-8">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <ShieldCheckIcon className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div className="mr-3">
                        <h3 className="text-md font-bold text-yellow-800 dark:text-yellow-200">تنبيه هام بخصوص صلاحية الختمات</h3>
                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                            <p>
                                سيتم حذف جميع الختمات (العامة والخاصة) تلقائياً بعد مرور <strong>10 أيام</strong> على إنشائها. كما سيتم حذف أي ختمة لم تشهد أي تفاعل (حجز أو إتمام) خلال <strong>24 ساعة</strong> من إنشائها.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-300 mb-4 text-center">الختميات العامة المتاحة</h2>
                <PublicKhatmahsList khatmahs={publicKhatmahs} loading={loadingPublic} />
            </div>

            {history.length > 0 && (
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-300 mb-4 text-center">ختمياتي الأخيرة</h2>
                    <ul className="space-y-3">
                        {history.map(h => (
                            <li key={h.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                                <a href={`#/khatmiyah/${h.id}`} className="flex-grow">
                                    <span className="font-semibold text-lg text-gray-800 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 transition-colors">{h.name}</span>
                                    <span className="block text-sm font-mono text-gray-500 dark:text-gray-400 mt-1">{h.id}</span>
                                </a>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRemoveFromHistory(h.id); }} 
                                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors flex-shrink-0"
                                    title="إزالة من القائمة"
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div>
                <div className={`flex flex-col sm:flex-row gap-4`}>
                    <button onClick={onCreate} className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-transform hover:scale-105">
                        <PlusIcon className="w-6 h-6" />
                        <span>إنشاء ختمة جديدة</span>
                    </button>
                    <button onClick={onJoin} className="flex-1 px-6 py-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        الانضمام برابط أو كود
                    </button>
                </div>
            </div>
        </div>
        
        {modal === 'create' && <CreateModal onClose={() => setModal(null)} onCreate={handleCreate} />}
        {modal === 'join' && <JoinModal onClose={() => setModal(null)} onJoin={handleJoin} />}
    </div>
);

const PublicKhatmahsList: React.FC<{ khatmahs: Khatmah[], loading: boolean }> = ({ khatmahs, loading }) => {
    if (loading) {
        return <div className="flex justify-center p-8"><SpinnerIcon className="w-8 h-8 text-green-500"/></div>;
    }

    if (khatmahs.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 py-4 text-center">لا توجد ختمات عامة حالياً. كن أول من يبدأ واحدة!</p>;
    }

    const calculateProgressData = (khatmah: Khatmah) => {
        const completedCount = Object.values(khatmah.juz_status).filter((s: JuzStatus) => s.status === 'completed').length;
        const reservedCount = Object.values(khatmah.juz_status).filter((s: JuzStatus) => s.status === 'reserved').length;
        return {
            completedPercent: (completedCount / 30) * 100,
            reservedPercent: (reservedCount / 30) * 100,
        };
    };

    const getCardStyling = (khatmah: Khatmah) => {
        const { completedPercent } = calculateProgressData(khatmah);
        const progress = completedPercent;
        const createdAt = khatmah.createdAt?.toDate();
        const ageInHours = createdAt ? (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60) : Infinity;

        let bgClass = 'bg-white dark:bg-gray-800';
        let borderClass = 'border-gray-200 dark:border-gray-700';
        let titleClass = 'text-gray-800 dark:text-gray-200 group-hover:text-green-600 dark:group-hover:text-green-400';
        let progressBgClass = 'bg-gray-200 dark:bg-gray-700';
        
        if (progress >= 90) {
            bgClass = 'bg-yellow-50 dark:bg-yellow-900/40';
        } else if (progress >= 50) {
            bgClass = 'bg-blue-50 dark:bg-blue-900/40';
        }

        if (ageInHours < 24) {
            borderClass = 'border-green-500 dark:border-green-400';
        }
        
        return { bgClass, borderClass, titleClass, progressBgClass };
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {khatmahs.map(k => {
                const { completedPercent, reservedPercent } = calculateProgressData(k);
                const { bgClass, borderClass, titleClass, progressBgClass } = getCardStyling(k);
                return (
                    <a key={k.id} href={`#/khatmiyah/${k.id}`} className={`group block p-4 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 border-2 ${bgClass} ${borderClass}`}>
                        <div className="flex justify-between items-baseline mb-2">
                             <h3 className={`font-bold text-lg truncate transition-colors ${titleClass}`} title={k.name}>{k.name}</h3>
                             <span className="text-sm font-mono font-semibold text-green-600 dark:text-green-400">{Math.round(completedPercent)}%</span>
                        </div>
                        <div className={`w-full ${progressBgClass} rounded-full h-2 overflow-hidden flex`}>
                            <div className="bg-green-500 h-full" style={{ width: `${completedPercent}%` }}></div>
                            <div className="bg-yellow-400 h-full" style={{ width: `${reservedPercent}%` }}></div>
                        </div>
                    </a>
                );
            })}
        </div>
    );
};

const KhatmahDashboard: React.FC<{
    khatmah: Khatmah;
    onJuzClick: (juz: number, status: JuzStatus) => void;
    onUnreserve: (juz: number) => void;
    updatingJuz: number | null;
}> = ({ khatmah, onJuzClick, onUnreserve, updatingJuz }) => {
    const [copySuccess, setCopySuccess] = useState<'code' | 'link' | null>(null);
    
    const { completedCount, reservedCount } = useMemo(() => {
        const counts = { completed: 0, reserved: 0 };
        // FIX: Add type annotation to fix 'property does not exist on type unknown' error.
        Object.values(khatmah.juz_status).forEach((s: JuzStatus) => {
            if (s.status === 'completed') {
                counts.completed++;
            } else if (s.status === 'reserved') {
                counts.reserved++;
            }
        });
        return { completedCount: counts.completed, reservedCount: counts.reserved };
    }, [khatmah.juz_status]);

    const completedPercent = (completedCount / 30) * 100;
    const reservedPercent = (reservedCount / 30) * 100;

    const handleCopyCode = useCallback(() => {
        navigator.clipboard.writeText(khatmah.id).then(() => {
            setCopySuccess('code');
            setTimeout(() => setCopySuccess(null), 2500);
        });
    }, [khatmah.id]);

    const handleCopyLink = useCallback(() => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopySuccess('link');
            setTimeout(() => setCopySuccess(null), 2500);
        });
    }, []);
    
    return (
         <div className="animate-fade-in w-full max-w-4xl mx-auto px-4">
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <h1 className="text-3xl font-bold text-green-700 dark:text-green-300 truncate" title={khatmah.name}>{khatmah.name}</h1>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        khatmah.visibility === 'public'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                        {khatmah.visibility === 'public' ? 'عامة' : 'خاصة'}
                    </span>
                </div>
                
                 <div className="flex flex-col sm:flex-row items-stretch justify-center sm:justify-start gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-grow">
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">كود المشاركة</label>
                        <div className="flex items-center justify-center sm:justify-start mt-1 p-3 bg-white dark:bg-gray-800 rounded-md">
                            <span className="text-2xl font-mono font-bold tracking-widest text-green-700 dark:text-green-300 select-all">{khatmah.id}</span>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex sm:flex-col justify-around gap-2">
                        <button onClick={handleCopyCode} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors w-full">
                            {copySuccess === 'code' ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                            <span>{copySuccess === 'code' ? 'تم النسخ!' : 'نسخ الكود'}</span>
                        </button>
                        <button onClick={handleCopyLink} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors w-full">
                            {copySuccess === 'link' ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                            <span>{copySuccess === 'link' ? 'نسخ الرابط!' : 'نسخ الرابط'}</span>
                        </button>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2 text-sm font-semibold flex-wrap gap-x-4 gap-y-1">
                        <span className="text-gray-700 dark:text-gray-300">التقدم:</span>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> <span className="text-green-600 dark:text-green-400">إتمام: {completedCount}</span></span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> <span className="text-yellow-600 dark:text-yellow-400">حجز: {reservedCount}</span></span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></div> <span>متاح: {30 - completedCount - reservedCount}</span></span>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden flex">
                        <div 
                            className="bg-green-500 h-full transition-all duration-500" 
                            style={{ width: `${completedPercent}%` }}
                            title={`مكتمل: ${completedCount} جزء (${Math.round(completedPercent)}%)`}
                        ></div>
                        <div 
                            className="bg-yellow-400 h-full transition-all duration-500" 
                            style={{ width: `${reservedPercent}%` }}
                            title={`محجوز: ${reservedCount} جزء (${Math.round(reservedPercent)}%)`}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => {
                        const status = khatmah.juz_status[juz] || { status: 'available' };
                        const isUpdating = updatingJuz === juz;
                        let bgColor = 'bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-800/50';
                        let textColor = 'text-gray-800 dark:text-gray-200';
                        let borderColor = 'border-gray-200 dark:border-gray-600';
                        let title = `الجزء ${juz} - متاح`;

                        if (status.status === 'reserved') {
                            bgColor = 'bg-yellow-100 dark:bg-yellow-400/20';
                            textColor = 'text-yellow-800 dark:text-yellow-200';
                            borderColor = 'border-yellow-400 dark:border-yellow-500';
                            title = `الجزء ${juz} - محجوز بواسطة ${status.by}`;
                        } else if (status.status === 'completed') {
                            bgColor = 'bg-green-600 dark:bg-green-500';
                            textColor = 'text-white dark:text-gray-900';
                            borderColor = 'border-green-700 dark:border-green-600';
                            title = `الجزء ${juz} - أتمه ${status.by}`;
                        }

                        return (
                            <div key={juz} className="relative group">
                                <button
                                    onClick={() => onJuzClick(juz, status)}
                                    title={title}
                                    disabled={isUpdating}
                                    className={`w-full h-24 flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 ${bgColor} ${textColor} ${borderColor} disabled:cursor-wait`}
                                >
                                    {isUpdating ? <SpinnerIcon className="w-6 h-6"/> : (
                                        <>
                                            <span className="text-2xl font-bold">{juz}</span>
                                            {status.by && <span className="text-xs mt-1 truncate max-w-full">{status.by}</span>}
                                        </>
                                    )}
                                </button>
                                {status.status === 'reserved' && !isUpdating && (
                                    <button onClick={() => onUnreserve(juz)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="إلغاء الحجز">
                                        <ClearIcon className="w-3 h-3"/>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const Modal: React.FC<{onClose: () => void; title: string; children: React.ReactNode;}> = ({ onClose, title, children }) => (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="إغلاق">
                    <ClearIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="p-5">{children}</div>
        </div>
    </div>
);

const CreateModal: React.FC<{ onClose: () => void; onCreate: (name: string, visibility: 'public' | 'private') => Promise<void> }> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'private'>('private');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;
        
        setIsSubmitting(true);
        try {
            await onCreate(trimmedName, visibility);
        } catch (error) {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal onClose={onClose} title="إنشاء ختمة جديدة">
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="khatmahName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم الختمة</label>
                    <input
                        type="text"
                        id="khatmahName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="مثال: ختمة العائلة"
                        required
                        autoFocus
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع الختمة</label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border dark:border-gray-600 rounded-lg cursor-pointer has-[:checked]:bg-green-50 has-[:checked]:border-green-500 dark:has-[:checked]:bg-green-900/40">
                            <input type="radio" name="visibility" value="private" checked={visibility === 'private'} onChange={() => setVisibility('private')} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                            <div>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">خاصة</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">يمكن الانضمام عبر الرابط أو الكود فقط.</p>
                            </div>
                        </label>
                         <label className="flex items-center gap-3 p-3 border dark:border-gray-600 rounded-lg cursor-pointer has-[:checked]:bg-green-50 has-[:checked]:border-green-500 dark:has-[:checked]:bg-green-900/40">
                            <input type="radio" name="visibility" value="public" checked={visibility === 'public'} onChange={() => setVisibility('public')} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                            <div>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">عامة</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">تظهر للجميع في قائمة الختمات المتاحة.</p>
                            </div>
                        </label>
                    </div>
                </div>

                <button type="submit" disabled={isSubmitting || !name.trim()} className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-400">
                    {isSubmitting ? <SpinnerIcon className="w-5 h-5"/> : 'إنشاء'}
                </button>
            </form>
        </Modal>
    );
};

const JoinModal: React.FC<{ onClose: () => void; onJoin: (id: string) => void }> = ({ onClose, onJoin }) => {
    const [id, setId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onJoin(id);
    };

    return (
         <Modal onClose={onClose} title="الانضمام إلى ختمة">
            <form onSubmit={handleSubmit}>
                <label htmlFor="khatmahId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رابط أو كود الختمة</label>
                <input
                    type="text"
                    id="khatmahId"
                    value={id}
                    onChange={(e) => {
                        let value = e.target.value;
                        if (value.includes('#/khatmiyah/')) {
                            const parts = value.split('#/khatmiyah/');
                            setId((parts[1] || '').toUpperCase());
                        } else {
                            setId(value.trim().toUpperCase());
                        }
                    }}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="أدخل الرابط أو الكود هنا"
                    required
                    autoFocus
                />
                <button type="submit" disabled={!id.trim()} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-400">
                    انضمام
                </button>
            </form>
        </Modal>
    );
};

const ReserveModal: React.FC<{ juzNumber: number, onClose: () => void; onReserve: (juz: number, name: string) => Promise<void> }> = ({ juzNumber, onClose, onReserve }) => {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;

        setIsSubmitting(true);
        try {
            await onReserve(juzNumber, trimmedName);
        } catch (error) {
            setIsSubmitting(false);
        }
    };
    
     return (
        <Modal onClose={onClose} title={`حجز الجزء ${juzNumber}`}>
            <form onSubmit={handleSubmit}>
                <label htmlFor="reserverName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الاسم (لتسجيل من سيقرأ الجزء)</label>
                <input
                    type="text"
                    id="reserverName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="اكتب اسمك هنا"
                    required
                    autoFocus
                />
                <button type="submit" disabled={isSubmitting || !name.trim()} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-400">
                     {isSubmitting ? <SpinnerIcon className="w-5 h-5"/> : 'تأكيد الحجز'}
                </button>
            </form>
        </Modal>
    );
};

export default KhatmiyahView;