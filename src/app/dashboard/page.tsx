'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';


export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Business state
  const [business, setBusiness] = useState<any>(null);
  const [kb, setKb] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchBusinessData(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchBusinessData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the login link!');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Phase 1 Fix: Tenant Isolation using user_id
  const fetchBusinessData = async (userId: string) => {
    const { data: bData, error: bError } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (bData) {
      setBusiness(bData);
      const { data: kbData } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('business_id', bData.id)
        .single();
      setKb(kbData || { content: '' });
    } else {
      // Initial empty state for new users
      setBusiness({ name: '', whatsapp: '', widget_id: crypto.randomUUID() });
      setKb({ content: '' });
    }
  };

  const saveBusinessData = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    let currentBusinessId = business.id;

    if (!currentBusinessId) {
      // New business: create row tied to the logged-in user
      const { data: newB, error: bError } = await supabase
        .from('businesses')
        .insert({
          user_id: session.user.id,
          name: business.name,
          whatsapp: business.whatsapp,
          description: business.description,
          hours: business.hours,
          phone: business.phone,
          widget_id: business.widget_id,
          active: true,
        })
        .select()
        .single();

      if (bError || !newB) {
        setMessage('❌ Error creating business: ' + (bError?.message || 'Unknown error'));
        setSaving(false);
        return;
      }
      currentBusinessId = newB.id;
      setBusiness(newB);
    } else {
      // Existing business: update all fields including the new ones
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          name: business.name,
          whatsapp: business.whatsapp,
          description: business.description,
          hours: business.hours,
          phone: business.phone,
        })
        .eq('id', currentBusinessId);

      if (updateError) {
        setMessage('❌ Error saving: ' + updateError.message);
        setSaving(false);
        return;
      }
    }

    // Save knowledge base content
    if (kb?.id) {
      const { error: kbError } = await supabase
        .from('knowledge_base')
        .update({ content: kb.content })
        .eq('id', kb.id);
      if (kbError) {
        setMessage('❌ Error saving knowledge base: ' + kbError.message);
        setSaving(false);
        return;
      }
    } else {
      const { data: newKb, error: kbError } = await supabase
        .from('knowledge_base')
        .insert({ business_id: currentBusinessId, content: kb?.content || '' })
        .select()
        .single();
      if (kbError) {
        setMessage('❌ Error saving knowledge base: ' + kbError.message);
        setSaving(false);
        return;
      }
      if (newKb) setKb(newKb);
    }

    setMessage('✅ Changes saved successfully!');
    setSaving(false);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-xl shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">iLEO Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black shadow-sm focus:outline-none focus:ring-[#1D9E75] focus:border-[#1D9E75]"
                placeholder="owner@business.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1D9E75] hover:bg-[#15805e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D9E75]"
            >
              {loading ? 'Sending link...' : 'Send Magic Link'}
            </button>
          </form>
          {message && <p className="mt-4 text-center text-sm text-gray-600">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900">
            Log out
          </button>
        </div>

        {business ? (
          <form onSubmit={saveBusinessData} className="bg-white shadow rounded-lg p-6 space-y-6">
            
            {business.id && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4 mb-6 space-y-3">
                <h3 className="font-semibold text-sm">Your Integration Code</h3>

                {/* Local test link */}
                <div>
                  <p className="text-xs font-medium mb-1">🧪 Test locally (dev server only):</p>
                  <a
                    href={`/test.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    Open test page → http://localhost:3000/test.html
                  </a>
                </div>

                {/* Production snippet */}
                <div>
                  <p className="text-xs font-medium mb-1">🚀 Production — paste before &lt;/body&gt; on your website:</p>
                  <code className="block bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto whitespace-pre">
                    {`<script src="https://tunibot.vercel.app/widget.js" data-business-id="${business.widget_id}"></script>`}
                  </code>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={business.name || ''}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-[#1D9E75] focus:border-[#1D9E75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={business.whatsapp || ''}
                onChange={(e) => setBusiness({ ...business, whatsapp: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-[#1D9E75] focus:border-[#1D9E75]"
                placeholder="+216XXXXXXXX"
              />
            </div>

            {/* P1-5: New fields — description, hours, phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Description</label>
              <textarea
                rows={3}
                value={business.description || ''}
                onChange={(e) => setBusiness({ ...business, description: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-[#1D9E75] focus:border-[#1D9E75]"
                placeholder="Brief description of your business for the AI assistant..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours</label>
              <input
                type="text"
                value={business.hours || ''}
                onChange={(e) => setBusiness({ ...business, hours: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-[#1D9E75] focus:border-[#1D9E75]"
                placeholder="e.g. Mon–Fri 9am–6pm, Sat 10am–2pm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={business.phone || ''}
                onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-[#1D9E75] focus:border-[#1D9E75]"
                placeholder="+216 XX XXX XXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge Base (FAQs, Hours, Info)</label>
              <textarea
                rows={8}
                value={kb?.content || ''}
                onChange={(e) => setKb({ ...kb, content: e.target.value })}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black focus:ring-[#1D9E75] focus:border-[#1D9E75]"
                placeholder="Enter everything the bot needs to know to answer questions..."
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className={`text-sm font-medium ${message.startsWith('❌') ? 'text-red-600' : 'text-green-600'}`}>{message}</span>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#1D9E75] hover:bg-[#15805e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D9E75]"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
            Loading business data...
          </div>
        )}
      </div>
    </div>
  );
}
