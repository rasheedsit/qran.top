import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import type { Comment as CommentType } from '../../types';
import Comment from './Comment';
import { SpinnerIcon } from '../icons';

interface CommentsListProps {
    topicId: string;
    addComment: (text: string, parentId: string | null) => Promise<void>;
}

const CommentsList: React.FC<CommentsListProps> = ({ topicId, addComment }) => {
    const [allDocs, setAllDocs] = useState<CommentType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!topicId) return;
        setLoading(true);

        const unsubscribe = db.collection('qran_comments')
            .where('topicId', '==', topicId)
            .onSnapshot(snapshot => {
                const fetchedDocs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as CommentType));
                
                // Also fetch admin actions to know what to filter out
                db.collection('qran_comments').where('topicId', '==', '__ADMIN_ACTIONS__').get().then(adminSnapshot => {
                    const adminDocs = adminSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentType));
                    setAllDocs([...fetchedDocs, ...adminDocs]);
                    setLoading(false);
                });

            }, error => {
                console.error("Error fetching documents. This may require a Firestore index.", error);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [topicId]);

    const { visibleComments, repliesMap } = useMemo(() => {
        // Find deletion actions disguised as comments
        const adminActions = allDocs.filter(doc => doc.topicId === '__ADMIN_ACTIONS__');
        const deletionTargets = new Set<string>();
        adminActions.forEach(action => {
            const parts = action.text.split('::');
            if (parts.length === 2 && (parts[0] === '__DELETE_COMMENT__' || parts[0] === '__DELETE_REPORT__')) {
                deletionTargets.add(parts[1]); // This is the ID of the comment/report to hide
            }
        });

        // Filter out deleted comments and any non-comment docs
        const validDocs = allDocs.filter(doc => 
            !deletionTargets.has(doc.id) &&      // hide the deleted doc itself
            !doc.type &&                         // hide reports
            doc.topicId !== '__ADMIN_ACTIONS__'  // hide the action doc
        );
        
        const commentsById = new Map<string, CommentType>();
        validDocs.forEach(c => commentsById.set(c.id, c));
        
        const repliesMap = new Map<string, CommentType[]>();
        const topLevelComments: CommentType[] = [];

        validDocs.forEach(comment => {
            if (comment.parentId && commentsById.has(comment.parentId)) {
                if (!repliesMap.has(comment.parentId)) {
                    repliesMap.set(comment.parentId, []);
                }
                repliesMap.get(comment.parentId)!.push(comment);
            } else if (!comment.parentId) {
                topLevelComments.push(comment);
            }
        });
        
        // Sort replies by creation date
        repliesMap.forEach(replies => {
            replies.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0));
        });

        // Sort top-level comments by creation date
        topLevelComments.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));

        return { visibleComments: topLevelComments, repliesMap };
    }, [allDocs]);

    if (loading) {
        return <div className="flex justify-center p-8"><SpinnerIcon className="w-8 h-8 text-text-muted" /></div>;
    }
    
    if (visibleComments.length === 0) {
        return <p className="text-center text-text-muted py-6">لا توجد تعليقات بعد. كن أول من يشارك!</p>
    }

    return (
        <div className="mt-6 space-y-6">
            {visibleComments.map(comment => (
                <Comment 
                    key={comment.id} 
                    comment={comment} 
                    addComment={addComment} 
                    replies={repliesMap.get(comment.id) || []}
                />
            ))}
        </div>
    );
};

export default CommentsList;