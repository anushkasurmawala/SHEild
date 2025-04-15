import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Plus, Trash2, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { EmergencyContactModal } from '../../components/EmergencyContactModal';

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  relationship: string;
}

const EmergencyContacts = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      if (data) {
        setContacts(data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContacts(contacts.filter(contact => contact.id !== id));
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

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
      className="min-h-screen p-4 space-y-6 pb-24 max-w-2xl mx-auto"
    >
      <div className="glass-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              <Shield className="w-6 h-6 mr-2 text-purple-400" />
              Emergency Contacts
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Add trusted contacts who will be notified in case of emergency
            </p>
          </div>
          <button
            onClick={() => setShowAddContact(true)}
            className="neon-button !p-2"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Contacts List */}
        <div className="space-y-4 mt-6">
          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 mx-auto text-purple-400 mb-4" />
              <p className="text-gray-400">No emergency contacts added yet</p>
              <button
                onClick={() => setShowAddContact(true)}
                className="neon-button mt-4"
              >
                Add Your First Contact
              </button>
            </div>
          ) : (
            contacts.map(contact => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium">{contact.name}</h3>
                  <p className="text-sm text-gray-400">{contact.phone_number}</p>
                  {contact.relationship && (
                    <p className="text-xs text-purple-400">{contact.relationship}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCall(contact.phone_number)}
                    className="neon-button !p-2"
                  >
                    <Phone size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="neon-button !p-2 !border-red-500 hover:!border-red-400"
                  >
                    <Trash2 size={20} className="text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <EmergencyContactModal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        onSuccess={() => {
          fetchContacts();
          setShowAddContact(false);
        }}
      />
    </motion.div>
  );
};

export default EmergencyContacts;