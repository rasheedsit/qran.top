import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import type { Comment as CommentType } from '../../types';
import CommentForm from './CommentForm';
import { FlagIcon, SpinnerIcon, UserCircleIcon } from '../icons';

interface CommentProps {
    comment: CommentType;
    addComment: (text: string, parentId: string | null) => Promise<void>;
    replies: CommentType[];
}

const REPORTED_COMMENTS_KEY = 'qran_app_reported_comments_v4';

const Comment: React.FC<CommentProps> = ({ comment, addComment, replies }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    
    const [isReported, setIsReported] = useState(() => {
        try {
            const reportedIds = JSON.parse(localStorage.getItem(REPORTED_COMMENTS_KEY) || '[]');
            return reportedIds.includes(comment.id);
        } catch {
            return false;
        }
    });
    const [isReporting, setIsReporting] = useState(false);

    const timeAgo = (date: any) => {
        if (!date?.toDate) return '';
        const seconds = Math.floor((new Date().getTime() - date.toDate().getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return `منذ ${Math.floor(interval)} سنوات`;
        interval = seconds / 2592000;
        if (interval > 1) return `منذ ${Math.floor(interval)} شهر`;
        interval = seconds / 86400;
        if (interval > 1) return `منذ ${Math.floor(interval)} أيام`;
        interval = seconds / 3600;
        if (interval > 1) return `منذ ${Math.floor(interval)} ساعات`;
        interval = seconds / 60;
        if (interval > 1) return `منذ ${Math.floor(interval)} دقائق`;
        return 'الآن';
    };

    const handleReport = async () => {
        if (isReported || isReporting) {
            alert("لقد أبلغت عن هذا التعليق بالفعل.");
            return;
        }

        if (!window.confirm("هل أنت متأكد من أنك تريد الإبلاغ عن هذا التعليق؟")) {
            return;
        }

        setIsReporting(true);
        try {
            const reportDoc = {
                type: 'report',
                targetId: comment.id,
                text: comment.text, // For admin review
                topicId: comment.topicId,
                createdAt: db.app.firebase_.firestore.FieldValue.serverTimestamp(),
                parentId: null,
            };
            
            await db.collection('qran_comments').add(reportDoc);

            const reportedIds = JSON.parse(localStorage.getItem(REPORTED_COMMENTS_KEY) || '[]');
            if (!reportedIds.includes(comment.id)) {
                reportedIds.push(comment.id);
                localStorage.setItem(REPORTED_COMMENTS_KEY, JSON.stringify(reportedIds));
            }
            setIsReported(true);
            alert("شكراً لك. تم استلام بلاغك وسيقوم المشرفون بمراجعته.");

        } catch (error: any) {
            console.error("Error reporting comment: ", error);
            alert(`حدث خطأ أثناء إرسال البلاغ.\n\nالسبب: ${error.message}`);
        } finally {
            setIsReporting(false);
        }
    };

    const handleReplySubmit = async (text: string) => {
        await addComment(text, comment.id);
        setShowReplyForm(false);
        if (!showReplies) {
            setShowReplies(true);
        }
    };

    return (
        <div className="flex items-start gap-3">
             <div className="flex-shrink-0 mt-1">
                {comment.author && comment.author.photoURL ? (
                    <img src={comment.author.photoURL} alt={comment.author.displayName || ''} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer"/>
                ) : (
                    <UserCircleIcon className="w-8 h-8 text-text-subtle" />
                )}
            </div>

            <div className="flex-grow">
                <div className="bg-surface-subtle p-3 rounded-lg">
                    <div className="flex justify-between items-baseline">
                        <p className="font-bold text-sm text-text-primary">
                            {comment.author ? comment.author.displayName : 'مستخدم مجهول'}
                        </p>
                        <span className="text-xs text-text-subtle">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-text-secondary whitespace-pre-wrap mt-1">{comment.text}</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-text-muted mt-1 px-2">
                    <button onClick={() => setShowReplyForm(!showReplyForm)} className="hover:text-primary">رد</button>
                    <button 
                        onClick={handleReport} 
                        disabled={isReported || isReporting}
                        className={`flex items-center gap-1 hover:text-yellow-600 disabled:cursor-not-allowed ${isReported ? 'text-yellow-500' : ''}`}
                    >
                      {isReporting ? <SpinnerIcon className="w-4 h-4 animate-spin"/> : <FlagIcon className="w-4 h-4" />}
                      <span>{isReported ? 'تم الإبلاغ' : (isReporting ? 'جاري الإرسال...' : 'إبلاغ')}</span>
                    </button>
                </div>
            
                {showReplyForm && (
                     <CommentForm 
                        onSubmit={handleReplySubmit}
                        onCancel={() => setShowReplyForm(false)}
                        placeholder={`الرد على هذا التعليق...`}
                     />
                )}

                {showReplies && replies.length > 0 && (
                    <div className="mt-4 space-y-4">
                        {replies.map(reply => <Comment key={reply.id} comment={reply} addComment={addComment} replies={[]} />)}
                    </div>
                )}
                
                {replies.length > 0 && !showReplies && (
                    <button onClick={() => setShowReplies(true)} className="text-xs font-bold text-primary-text mt-2 hover:underline">
                        {`عرض الردود (${replies.length})`}
                    </button>
                 )
                }
                 {replies.length > 0 && showReplies && (
                    <button onClick={() => setShowReplies(false)} className="text-xs font-bold text-primary-text mt-2 hover:underline">
                        إخفاء الردود
                    </button>
                 )
                }
            </div>
        </div>
    );
};

export default Comment;