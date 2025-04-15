import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Video, Mic, Trash2, Calendar, Filter, Grid, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Recording {
  id: string;
  type: 'audio' | 'video';
  data: string;
  mime_type: string;
  created_at: string;
}

const Recordings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'audio' | 'video'>('all');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchRecordings();
    }
  }, [user]);

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Get unique dates for filtering
        const uniqueDates = [...new Set(data.map(recording => 
          new Date(recording.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
          })
        ))];
        setDates(uniqueDates);
        setRecordings(data);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const recording = recordings.find(r => r.id === id);
      if (!recording) return;

      // Delete from database
      const { error: dbError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setRecordings(recordings.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRecordings = recordings
    .filter(recording => filter === 'all' || recording.type === filter)
    .filter(recording => selectedDate === 'all' || 
      new Date(recording.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      }) === selectedDate
    );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 space-y-6 pb-24"
    >
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center">
            <FileText className="w-6 h-6 mr-2 text-purple-400" />
            Recordings
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 glass-card !p-1">
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  view === 'grid' ? 'bg-purple-500/20' : 'hover:bg-white/5'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition-colors ${
                  view === 'list' ? 'bg-purple-500/20' : 'hover:bg-white/5'
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'audio' | 'video')}
            className="input-field !py-2 !px-3"
          >
            <option value="all">All Types</option>
            <option value="audio">Audio Only</option>
            <option value="video">Video Only</option>
          </select>

          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field !py-2 !px-3"
          >
            <option value="all">All Dates</option>
            {dates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {filteredRecordings.length === 0 ? (
            <p className="text-center text-gray-400">No recordings found</p>
          ) : (
            <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
              {filteredRecordings.map(recording => (
                <div key={recording.id} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {recording.type === 'video' ? (
                      <Video className="text-purple-400" />
                    ) : (
                      <Mic className="text-purple-400" />
                    )}
                    <div>
                      <p className="font-medium">
                        {recording.type.charAt(0).toUpperCase() + recording.type.slice(1)} Recording
                      </p>
                      <p className="text-sm text-gray-400">
                        {formatDate(recording.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(recording.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                
                {recording.type === 'video' ? (
                  <video
                    src={`data:${recording.mime_type};base64,${recording.data}`}
                    controls
                    className="mt-4 w-full rounded-lg"
                  />
                ) : (
                  <audio
                    src={`data:${recording.mime_type};base64,${recording.data}`}
                    controls
                    className="mt-4 w-full"
                  />
                )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Recordings;