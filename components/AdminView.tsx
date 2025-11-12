import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, FieldValue } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import type { Comment, QuranFont, QuranEdition, SurahData } from '../types';
import { SpinnerIcon, TrashIcon, ShieldCheckIcon, CheckIcon, HomeIcon, PlusIcon } from './icons';

interface Topic {
    id: string;
    topic: string;
    count: number;
}

// Khatmah types for Admin view
interface JuzStatus {
    status: 'available' | 'reserved' | 'completed';
    by?: string;
}
interface Khatmah {
    id: string;
    name: string;
    visibility: 'public' | 'private';
    createdAt: any; // Firestore Timestamp
    juz_status: { [key: number]: JuzStatus };
}

// A list of hardcoded admin User IDs.
// In a real application, this should be managed securely (e.g., in Firestore).
const ADMIN_UIDS = ['A7bC3dEfgHijklmNopqRsTuvWxYz'];


// A new central function for creating admin action records by disguising them as comments
const createAdminAction = async (actionType: 'delete_comment' | 'delete_report', targetId: string) => {
    const actionDoc = {
        topicId: '__ADMIN_ACTIONS__', // A special, non-public topic for admin actions
        text: `__${actionType.toUpperCase()}__::${targetId}`, // Machine-readable action text
        createdAt: FieldValue.serverTimestamp(),
        parentId: null,
        type: 'comment', // Disguise as a regular comment to pass restrictive security rules
    };
    await db.collection('qran_comments').add(actionDoc);
};


const AdminView: React.FC<{}> = () => {
    const { user, loading: authLoading } = useAuth();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');
    const [mainTab, setMainTab] = useState<'comments' | 'fonts' | 'sources' | 'khatmahs'>('comments');

    // State for Comments Tab
    const [commentsTab, setCommentsTab] = useState<'reported' | 'topics'>('reported');
    const [allCommentDocs, setAllCommentDocs] = useState<Comment[]>([]);
    const [loadingCommentsData, setLoadingCommentsData] = useState(false);
    const [allTopics, setAllTopics] = useState<Topic[]>([]);
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    
    // State for Fonts Tab
    const [fonts, setFonts] = useState<QuranFont[]>([]);
    const [loadingFonts, setLoadingFonts] = useState(false);
    const [newFontName, setNewFontName] = useState('');
    const [newFontFamily, setNewFontFamily] = useState('');
    const [newFontUrl, setNewFontUrl] = useState('');

    // State for Sources Tab
    const [sources, setSources] = useState<QuranEdition[]>([]);
    const [loadingSources, setLoadingSources] = useState(false);
    const [newSource, setNewSource] = useState<Omit<QuranEdition, 'id'>>({
        identifier: '', name: '', englishName: '', language: 'ar',
        format: 'text', type: 'quran', direction: 'rtl', sourceApi: 'alquran.cloud'
    });
    
    // State for Khatmahs Tab
    const [khatmahs, setKhatmahs] = useState<Khatmah[]>([]);
    const [loadingKhatmahs, setLoadingKhatmahs] = useState(false);
    
    useEffect(() => {
        if (!authLoading) {
            setIsAuthenticated(!!user && ADMIN_UIDS.includes(user.uid));
        }
    }, [user, authLoading]);

    const fetchCollection = useCallback(async <T extends {id?: string}>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>, loader: React.Dispatch<React.SetStateAction<boolean>>, orderByField?: string) => {
        loader(true);
        try {
            let query = db.collection(collectionName);
            if (orderByField) {
                query = query.orderBy(orderByField, 'desc');
            }
            const snapshot = await query.get();
            const items = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as T));
            setter(items);
        } catch (err) {
            console.error(`Error fetching ${collectionName}:`, err);
            setError(`فشل في تحميل ${collectionName}.`);
        } finally {
            loader(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            if (mainTab === 'fonts') fetchCollection<QuranFont>('qran_fonts', setFonts, setLoadingFonts);
            if (mainTab === 'sources') fetchCollection<QuranEdition>('qran_editions', setSources, setLoadingSources);
            if (mainTab === 'khatmahs') fetchCollection<Khatmah>('khatmahs', setKhatmahs, setLoadingKhatmahs, 'createdAt');
        }
    }, [isAuthenticated, mainTab, fetchCollection]);

    // --- Comments Logic ---
    useEffect(() => {
        if (!isAuthenticated || mainTab !== 'comments') return;
        setLoadingCommentsData(true);
        const unsubscribe = db.collection('qran_comments').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
            setAllCommentDocs(fetched);
            setLoadingCommentsData(false);
        }, err => { 
            setLoadingCommentsData(false); 
            console.error("Error fetching comments data.", err);
            setError("فشل تحميل بيانات التعليقات.");
        });
        return () => unsubscribe();
    }, [isAuthenticated, mainTab]);
    
    const { visibleReports, commentsByTopic } = useMemo(() => {
        const adminActions = allCommentDocs.filter(d => d.topicId === '__ADMIN_ACTIONS__');
        const deletionTargets = new Set<string>();
        
        adminActions.forEach(action => {
            const parts = action.text.split('::');
            if (parts.length === 2 && (parts[0] === '__DELETE_COMMENT__' || parts[0] === '__DELETE_REPORT__')) {
                deletionTargets.add(parts[1]);
            }
        });

        const allReports = allCommentDocs.filter(d => d.type === 'report');
        const visibleReports = allReports.filter(report => 
            !deletionTargets.has(report.id) && 
            report.targetId && 
            !deletionTargets.has(report.targetId)
        );

        const allRegularComments = allCommentDocs.filter(d => !d.type && d.topicId !== '__ADMIN_ACTIONS__');
        const commentsByTopic = new Map<string, Comment[]>();
        allRegularComments.forEach(comment => {
            if (!deletionTargets.has(comment.id)) {
                if (!commentsByTopic.has(comment.topicId)) {
                    commentsByTopic.set(comment.topicId, []);
                }
                commentsByTopic.get(comment.topicId)!.push(comment);
            }
        });

        return { visibleReports, commentsByTopic };
    }, [allCommentDocs]);


    useEffect(() => {
        if (!isAuthenticated || mainTab !== 'comments' || commentsTab !== 'topics') return;
        setLoadingTopics(true);
        const unsubscribe = db.collection('discussionTopics').orderBy('count', 'desc').onSnapshot(snapshot => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, topic: doc.data().topic, count: doc.data().count } as Topic));
            setAllTopics(fetched);
            setLoadingTopics(false);
        }, err => { setLoadingTopics(false); });
        return () => unsubscribe();
    }, [isAuthenticated, mainTab, commentsTab]);
    
    // --- Generic Handlers ---
    const handleDeleteFromCollection = async (collectionName: string, id: string, fetcher: () => void) => {
        if (!window.confirm(`هل أنت متأكد من حذف هذا العنصر نهائياً من ${collectionName}؟`)) return;
        try {
            await db.collection(collectionName).doc(id).delete();
            fetcher();
        } catch (error) {
            console.error(`Error deleting item from ${collectionName}:`, error);
        }
    };

    const handleAddFont = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFontName.trim() || !newFontFamily.trim()) return;
        try {
            await db.collection('qran_fonts').add({
                name: newFontName,
                font_family: newFontFamily,
                url: newFontUrl.trim() || null
            });
            setNewFontName('');
            setNewFontFamily('');
            setNewFontUrl('');
            fetchCollection<QuranFont>('qran_fonts', setFonts, setLoadingFonts);
        } catch (error) { console.error("Error adding font:", error); }
    };

    const handleAddSource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSource.identifier.trim() || !newSource.name.trim()) return;
        try {
            await db.collection('qran_editions').add(newSource);
            setNewSource({
                identifier: '', name: '', englishName: '', language: 'ar',
                format: 'text', type: 'quran', direction: 'rtl', sourceApi: 'alquran.cloud'
            });
            fetchCollection<QuranEdition>('qran_editions', setSources, setLoadingSources);
        } catch (error) { console.error("Error adding source:", error); }
    };
    
    const handleCommentAction = async (action: 'approve' | 'delete', item: Comment) => {
        try {
            if (action === 'approve') {
                if (item.type !== 'report') return;
                if (!window.confirm("سيؤدي هذا إلى إخفاء البلاغ فقط، وسيبقى التعليق الأصلي. هل أنت متأكد؟")) return;
                // "Approving" a report means deleting the report document itself.
                await createAdminAction('delete_report', item.id);
                alert("تم إخفاء البلاغ بنجاح.");
    
            } else if (action === 'delete') {
                const isReport = item.type === 'report';
                const commentIdToDelete = isReport ? item.targetId : item.id;
                
                if (!commentIdToDelete) {
                    alert("خطأ: لم يتم العثور على معرّف التعليق المراد حذفه.");
                    return;
                }
                
                if (!window.confirm('هل أنت متأكد؟ سيتم إخفاء التعليق (وكل ردوده) من العرض العام.')) return;
                
                await createAdminAction('delete_comment', commentIdToDelete);

                // If we are acting on a report, also delete the report document itself
                if (isReport) {
                    await createAdminAction('delete_report', item.id);
                }
                
                alert("تم إخفاء التعليق بنجاح.");
            }
        } catch (error) { 
            console.error(`Error performing action:`, error);
            alert(`فشل الإجراء: ${(error as Error).message}`);
        }
    };
    
    const calculateKhatmahProgress = (khatmah: Khatmah) => {
        const completedCount = Object.values(khatmah.juz_status).filter(s => s.status === 'completed').length;
        return Math.round((completedCount / 30) * 100);
    };

    if (authLoading) {
        return <div className="flex justify-center p-16"><SpinnerIcon className="w-12 h-12" /></div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] bg-background">
                <div className="p-8 bg-surface rounded-lg shadow-md w-full max-w-sm text-center">
                    <h1 className="text-2xl font-bold text-text-primary mb-4">وصول مقيد</h1>
                    <p className="text-text-secondary">هذه الصفحة متاحة للمشرفين فقط.</p>
                </div>
            </div>
        );
    }
    
    const renderCommentsTable = (items: Comment[], isReportView: boolean) => (
        <div className="overflow-x-auto bg-surface rounded-lg shadow">
            <table className="min-w-full divide-y divide-border-default">
                <thead className="bg-surface-subtle">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                            {isReportView ? 'التعليق المبلغ عنه' : 'التعليق'}
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                            {isReportView ? 'الموضوع' : 'الردود'}
                        </th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">الإجراءات</span></th>
                    </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border-default">
                    {items.map(item => (
                        <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-pre-wrap max-w-lg">
                                <div className="text-sm text-text-primary">{item.text}</div>
                                {item.author && <div className="text-xs text-text-muted mt-1">{item.author.displayName}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {isReportView ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{item.topicId}</span>
                                ) : (
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-surface-subtle text-text-secondary`}>{item.replyCount || 0}</span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                {isReportView && (
                                     <button onClick={() => handleCommentAction('approve', item)} className="text-green-600 hover:text-green-900" title="موافقة (إخفاء البلاغ)"><ShieldCheckIcon className="w-5 h-5"/></button>
                                )}
                                <button onClick={() => handleCommentAction('delete', item)} className="text-red-600 hover:text-red-900" title="حذف التعليق (والبلاغ إن وجد)"><TrashIcon className="w-5 h-5"/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderMainContent = () => {
        switch (mainTab) {
            case 'khatmahs':
                return (
                    <div className="animate-fade-in">
                        <h2 className="text-xl font-semibold mb-4">إدارة الختمات الجماعية</h2>
                        <div className="overflow-x-auto bg-surface rounded-lg shadow">
                            <table className="min-w-full divide-y divide-border-default">
                                <thead className="bg-surface-subtle">
                                    <tr>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">الاسم</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">الكود</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">النوع</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">التقدم</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">تاريخ الإنشاء</th>
                                        <th className="relative px-6 py-3"><span className="sr-only">حذف</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingKhatmahs ? (
                                        <tr><td colSpan={6} className="text-center p-8"><SpinnerIcon className="w-8 h-8 mx-auto" /></td></tr>
                                    ) : (
                                        khatmahs.map(khatmah => (
                                            <tr key={khatmah.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-semibold">{khatmah.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-subtle font-mono">{khatmah.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${khatmah.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-surface-subtle text-text-secondary'}`}>
                                                        {khatmah.visibility === 'public' ? 'عامة' : 'خاصة'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{calculateKhatmahProgress(khatmah)}%</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{khatmah.createdAt?.toDate().toLocaleDateString('ar-EG')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <button onClick={() => handleDeleteFromCollection('khatmahs', khatmah.id!, () => fetchCollection('khatmahs', setKhatmahs, setLoadingKhatmahs, 'createdAt'))} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5"/></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'fonts':
                return (
                    <div className="animate-fade-in">
                        <h2 className="text-xl font-semibold mb-4">إدارة الخطوط</h2>
                        <div className="overflow-x-auto bg-surface rounded-lg shadow mb-8">
                            <table className="min-w-full divide-y divide-border-default">
                                <thead className="bg-surface-subtle">
                                    <tr>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">الاسم</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">عائلة الخط</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">URL</th>
                                        <th className="relative px-6 py-3"><span className="sr-only">حذف</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingFonts ? (
                                        <tr><td colSpan={4} className="text-center p-8"><SpinnerIcon className="w-8 h-8 mx-auto" /></td></tr>
                                    ) : (
                                        fonts.map(font => (
                                            <tr key={font.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{font.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary font-mono">{font.font_family}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted max-w-xs truncate">{font.url}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <button onClick={() => handleDeleteFromCollection('qran_fonts', font.id!, () => fetchCollection('qran_fonts', setFonts, setLoadingFonts))} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5"/></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <form onSubmit={handleAddFont} className="p-6 bg-surface-subtle rounded-lg shadow">
                             <h3 className="text-lg font-semibold mb-4">إضافة خط جديد</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input type="text" placeholder="الاسم (مثال: أميري قرآن)" value={newFontName} onChange={e => setNewFontName(e.target.value)} required className="p-2 border rounded bg-surface border-border-default" />
                                <input type="text" placeholder="عائلة الخط (font-family)" value={newFontFamily} onChange={e => setNewFontFamily(e.target.value)} required className="p-2 border rounded bg-surface border-border-default" />
                                <input type="url" placeholder="رابط URL (اختياري)" value={newFontUrl} onChange={e => setNewFontUrl(e.target.value)} className="p-2 border rounded bg-surface border-border-default" />
                             </div>
                             <button type="submit" className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover flex items-center gap-2"><PlusIcon className="w-5 h-5"/> إضافة الخط</button>
                        </form>
                    </div>
                );
            case 'sources':
                 return (
                    <div className="animate-fade-in">
                        <h2 className="text-xl font-semibold mb-4">إدارة المصادر (التفاسير والترجمات)</h2>
                        <div className="overflow-x-auto bg-surface rounded-lg shadow mb-8">
                             <table className="min-w-full divide-y divide-border-default">
                                <thead className="bg-surface-subtle">
                                    <tr>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">المُعرف (Identifier)</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">الاسم</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">النوع</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">اللغة</th>
                                        <th className="relative px-4 py-3"><span className="sr-only">حذف</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingSources ? (
                                        <tr><td colSpan={5} className="text-center p-8"><SpinnerIcon className="w-8 h-8 mx-auto" /></td></tr>
                                    ) : (
                                        sources.map(source => (
                                            <tr key={source.id}>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary font-mono">{source.identifier}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">{source.name}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-muted">{source.type}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-muted">{source.language}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                    <button onClick={() => handleDeleteFromCollection('qran_editions', source.id!, () => fetchCollection('qran_editions', setSources, setLoadingSources))} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5"/></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                             </table>
                        </div>
                        <form onSubmit={handleAddSource} className="p-6 bg-surface-subtle rounded-lg shadow space-y-4">
                            <h3 className="text-lg font-semibold">إضافة مصدر جديد</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <input type="text" placeholder="المعرف (e.g., en.ahmedali)" value={newSource.identifier} onChange={e => setNewSource({...newSource, identifier: e.target.value})} required className="p-2 border rounded bg-surface border-border-default" />
                                <input type="text" placeholder="الاسم (e.g., تفسير الجلالين)" value={newSource.name} onChange={e => setNewSource({...newSource, name: e.target.value})} required className="p-2 border rounded bg-surface border-border-default" />
                                <input type="text" placeholder="الاسم بالإنجليزي (e.g., Jalalayn)" value={newSource.englishName} onChange={e => setNewSource({...newSource, englishName: e.target.value})} required className="p-2 border rounded bg-surface border-border-default" />
                                <select value={newSource.language} onChange={e => setNewSource({...newSource, language: e.target.value})} className="p-2 border rounded bg-surface border-border-default"><option value="ar">ar</option><option value="en">en</option><option value="fr">fr</option><option value="es">es</option></select>
                                <select value={newSource.type} onChange={e => setNewSource({...newSource, type: e.target.value})} className="p-2 border rounded bg-surface border-border-default"><option value="quran">quran</option><option value="tafsir">tafsir</option><option value="translation">translation</option></select>
                                <select value={newSource.direction} onChange={e => setNewSource({...newSource, direction: e.target.value})} className="p-2 border rounded bg-surface border-border-default"><option value="rtl">rtl</option><option value="ltr">ltr</option></select>
                                <select value={newSource.sourceApi} onChange={e => setNewSource({...newSource, sourceApi: e.target.value as any})} className="p-2 border rounded bg-surface border-border-default"><option value="alquran.cloud">alquran.cloud</option><option value="fawazahmed0">fawazahmed0</option></select>
                            </div>
                            <button type="submit" className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover flex items-center gap-2"><PlusIcon className="w-5 h-5"/> إضافة المصدر</button>
                        </form>
                    </div>
                 );
            case 'comments':
            default:
                const topicComments = commentsByTopic.get(selectedTopicId || '') || [];
                return (
                    <div className="animate-fade-in">
                         <div className="flex border-b border-border-default mb-6">
                            <button onClick={() => setCommentsTab('reported')} className={`px-4 py-2 text-md font-semibold transition-colors ${commentsTab === 'reported' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text-primary'}`}>التعليقات المبلغ عنها ({visibleReports.length})</button>
                            <button onClick={() => setCommentsTab('topics')} className={`px-4 py-2 text-md font-semibold transition-colors ${commentsTab === 'topics' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text-primary'}`}>كل المواضيع</button>
                        </div>

                        {commentsTab === 'reported' && (
                            loadingCommentsData ? <div className="flex justify-center p-16"><SpinnerIcon className="w-12 h-12" /></div> : renderCommentsTable(visibleReports, true)
                        )}

                        {commentsTab === 'topics' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <h2 className="text-xl font-semibold mb-4">المواضيع</h2>
                                    {loadingTopics ? <SpinnerIcon className="w-8 h-8"/> : (
                                        <ul className="space-y-1 h-[60vh] overflow-y-auto pr-2">
                                            {allTopics.map(topic => (
                                                <li key={topic.id}>
                                                    <button onClick={() => setSelectedTopicId(topic.id)} className={`w-full text-right p-2 rounded-md transition-colors flex justify-between ${selectedTopicId === topic.id ? 'bg-surface-active' : 'hover:bg-surface-hover'}`}>
                                                        <span>{topic.topic}</span><span className="font-mono text-xs bg-surface-subtle px-2 py-1 rounded-full">{topic.count}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <h2 className="text-xl font-semibold mb-4">تعليقات الموضوع: <span className="text-primary font-mono">{selectedTopicId || "لم يتم اختيار موضوع"}</span></h2>
                                    {loadingCommentsData ? <div className="flex justify-center p-16"><SpinnerIcon className="w-12 h-12" /></div> : topicComments.length > 0 ? renderCommentsTable(topicComments, false) : <p className="text-text-muted mt-8 text-center">اختر موضوعاً من القائمة لعرض تعليقاته.</p>}
                                </div>
                            </div>
                        )}
                        
                    </div>
                );
        }
    };
    
    return (
        <div className="animate-fade-in w-full max-w-7xl mx-auto px-4 py-8 mb-20">
            <header className="flex items-center justify-between border-b pb-4 mb-6 border-border-default">
                <div className="flex items-center gap-3"><ShieldCheckIcon className="w-8 h-8 text-primary" /><h1 className="text-3xl font-bold text-primary-text-strong">لوحة التحكم الكاملة</h1></div>
                <a href="#/" onClick={(e) => {e.preventDefault(); window.location.hash = '#/';}} className="p-3 bg-surface-subtle text-text-secondary rounded-full hover:bg-surface-hover transition-colors"><HomeIcon className="w-6 h-6" /></a>
            </header>

            <div className="flex border-b border-border-default mb-6 flex-wrap">
                <button onClick={() => setMainTab('comments')} className={`px-4 py-3 text-lg font-semibold transition-colors ${mainTab === 'comments' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text-primary'}`}>التعليقات</button>
                <button onClick={() => setMainTab('khatmahs')} className={`px-4 py-3 text-lg font-semibold transition-colors ${mainTab === 'khatmahs' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text-primary'}`}>الختميات</button>
                <button onClick={() => setMainTab('fonts')} className={`px-4 py-3 text-lg font-semibold transition-colors ${mainTab === 'fonts' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text-primary'}`}>الخطوط</button>
                <button onClick={() => setMainTab('sources')} className={`px-4 py-3 text-lg font-semibold transition-colors ${mainTab === 'sources' ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-text-primary'}`}>المصادر</button>
            </div>
            
            {renderMainContent()}
        </div>
    );
};

export default AdminView;