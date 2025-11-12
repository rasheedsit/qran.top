import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { SpinnerIcon } from './icons';

interface Topic {
  id: string;
  topic: string;
  count: number;
}

// Function to shuffle an array for a more "cloud-like" random layout
const shuffleArray = (array: any[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
};


const CommentsCloudView: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        const topicsCollectionRef = db.collection('discussionTopics');
        const q = topicsCollectionRef.where('count', '>', 0).orderBy('count', 'desc').limit(100);
        const querySnapshot = await q.get();
        const topicsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              topic: data.topic,
              count: data.count,
            } as Topic
        });
        setTopics(shuffleArray(topicsData)); // Shuffle for a better cloud layout
      } catch (err) {
        console.error("Firebase fetch error:", err);
        setError('فشل في تحميل بيانات النقاشات. قد تكون هناك مشكلة في إعدادات Firebase أو اتصالك بالإنترنت.');
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  const fontSizes = useMemo(() => {
    if (topics.length === 0) return {};

    const counts = topics.map(t => t.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    
    // Using a logarithmic scale for better visual distribution.
    // This makes differences at the lower end more apparent.
    const minLog = Math.log(minCount);
    const maxLog = Math.log(maxCount);
    
    const minFontSize = 16;
    const maxFontSize = 48; // Max size as requested

    const sizes: { [key: string]: number } = {};
    topics.forEach(topic => {
      // Handle case where all topics have the same count to avoid division by zero
      if (maxLog === minLog) {
        sizes[topic.id] = minFontSize;
      } else {
        const scale = (Math.log(topic.count) - minLog) / (maxLog - minLog);
        sizes[topic.id] = minFontSize + scale * (maxFontSize - minFontSize);
      }
    });
    return sizes;
  }, [topics]);

  return (
    <div className="animate-fade-in w-full max-w-4xl mx-auto px-4">
      <main className="bg-surface p-6 sm:p-8 rounded-lg shadow-md transition-colors duration-300 min-h-[400px]">
        {loading && (
            <div className="flex justify-center items-center h-full p-10">
                <SpinnerIcon className="w-10 h-10 text-primary" />
            </div>
        )}
        {error && <div className="text-center p-10 text-red-500">{error}</div>}
        {!loading && !error && (
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-4 text-center">
                {topics.length > 0 ? (
                    topics.map(topic => (
                        <a
                            key={topic.id}
                            href={`#/search/${encodeURIComponent(topic.topic)}?from=comments&search_edition=quran-simple-clean&display_edition=quran-simple-clean`}
                            className="text-text-secondary hover:text-primary transition-colors duration-200 font-semibold"
                            style={{ fontSize: `${fontSizes[topic.id] || 16}px` }}
                            title={`${topic.count} تعليقات`}
                        >
                            {topic.topic}
                        </a>
                    ))
                ) : (
                    <div className="text-center p-10 text-text-muted">
                        <p className="text-lg">لا توجد نقاشات تفاعلية حالياً.</p>
                        <p className="mt-2 text-sm">ابدأ بفتح نقاش حول كلمة قرآنية لإثراء المحتوى.</p>
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default CommentsCloudView;