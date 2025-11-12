import React, { useState, useCallback, useEffect } from 'react';
import { ChatBubbleIcon } from './icons';
import { useAuth } from '../hooks/useAuth';
import { db, FieldValue } from '../firebase';
import CommentForm from './comments/CommentForm';
import CommentsList from './comments/CommentsList';
import type { Comment } from '../types';

interface DiscussionSectionProps {
  rawQuery: string;
  normalizedQuery: string;
  autoOpen?: boolean;
}

const DiscussionSection: React.FC<DiscussionSectionProps> = ({ rawQuery, normalizedQuery, autoOpen = false }) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const { user } = useAuth();

  useEffect(() => {
      setIsOpen(autoOpen);
  }, [autoOpen]);


  const handleToggleDiscussion = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const addComment = async (text: string, parentId: string | null = null) => {
    if (!text.trim()) return;

    const authorData = user ? { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL } : undefined;

    const commentData: Omit<Comment, 'id' | 'createdAt'> = {
        topicId: normalizedQuery,
        text: text.trim(),
        parentId: parentId,
        author: authorData,
        replyCount: 0,
        flagCount: 0,
        isDeleted: false,
    };
    
    try {
        await db.collection('qran_comments').add({
            ...commentData,
            createdAt: FieldValue.serverTimestamp(),
        });
    
        if (parentId) {
            const parentRef = db.collection('qran_comments').doc(parentId);
            await parentRef.update({
                replyCount: FieldValue.increment(1)
            });
        }
        
        // Use the normalized query as the document ID to unify topics
        const topicRef = db.collection("discussionTopics").doc(normalizedQuery);
        await db.runTransaction(async (transaction: any) => {
            const docSnap = await transaction.get(topicRef);
            if (docSnap.exists) {
                transaction.update(topicRef, {
                    count: FieldValue.increment(1),
                    lastDiscussed: FieldValue.serverTimestamp(),
                });
            } else {
                // When creating, store the clean, normalized topic as the display topic
                transaction.set(topicRef, {
                    topic: normalizedQuery,
                    rawQuery: rawQuery, // Keep the original search term for context if needed
                    count: 1,
                    lastDiscussed: FieldValue.serverTimestamp()
                });
            }
        });

    } catch (error: any) {
        console.error("Error adding comment to Firestore:", error);
        alert(`فشل إرسال التعليق.\n\nالسبب: ${error.message}\n\nقد يكون السبب هو عدم وجود صلاحيات كافية للكتابة في قاعدة البيانات. يرجى مراجعة قواعد الأمان (Security Rules) في مشروع Firebase.`);
        // Re-throw the error to be caught by the form component
        throw error;
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-border-default">
      <button
        onClick={handleToggleDiscussion}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-blue-500"
        aria-expanded={isOpen}
      >
        <ChatBubbleIcon className="w-6 h-6" />
        <span className="text-lg font-semibold">
          {isOpen ? 'إغلاق النقاش' : `فتح النقاش حول: "${normalizedQuery}"`}
        </span>
      </button>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[3000px] mt-4' : 'max-h-0'}`}>
        <div className="p-4 bg-surface-subtle rounded-lg">
          {isOpen && (
             <div>
                <CommentForm onSubmit={(text) => addComment(text, null)} />
                <CommentsList topicId={normalizedQuery} addComment={addComment} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscussionSection;