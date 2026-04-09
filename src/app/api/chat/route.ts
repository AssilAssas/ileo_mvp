import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// P0-1: CORS headers for cross-origin widget requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// P0-1: Handle browser preflight OPTIONS request
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, message: userMessageText, conversationId, lead } = await req.json();

    // P1: Validate required fields
    if (!businessId || !conversationId) {
      return NextResponse.json(
        { error: 'Missing businessId or conversationId' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 1. Fetch business info from Supabase
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*, knowledge_base(*)')
      .eq('widget_id', businessId)
      .eq('active', true)
      .single();

    if (businessError || !business) {
      console.error('Business fetch error:', businessError);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // 1.5 Handle lead capture if lead info is provided
    if (lead) {
      const { error: leadError } = await supabaseAdmin
        .from('leads')
        .insert({
          business_id: business.id,
          name: lead.name,
          phone: lead.phone,
          conversation_id: conversationId,
        });

      if (!leadError && process.env.N8N_WEBHOOK_URL) {
        try {
          await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessName: business.name,
              leadName: lead.name,
              leadPhone: lead.phone,
              whatsapp: business.whatsapp,
            }),
          });
        } catch (n8nError) {
          console.error('Failed to trigger n8n webhook', n8nError);
        }
      }

      // P1-4: Save lead message to conversation history
      await supabaseAdmin.from('conversations').upsert(
        { id: conversationId, business_id: business.id },
        { onConflict: 'id' }
      );
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: `[LEAD] Name: ${lead.name}, Phone: ${lead.phone}`,
      });

      return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
    }

    // SECURITY 1: Basic Input Sanitization & Length Cap
    // Prevent huge payloads (token exhaustion) and basic prompt injection attempts
    const sanitizedMessage = typeof userMessageText === 'string' 
      ? userMessageText.trim().substring(0, 500) 
      : '';

    if (!sanitizedMessage) {
      return NextResponse.json(
        { error: 'Missing or invalid message' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // SECURITY 2: Simple In-Memory Rate Limiting
    // Prevents rapid-fire spam from the same conversation ID (simple script protection)
    const now = Date.now();
    const windowMs = 5000; // 5 seconds between messages
    
    // Use global object to maintain state across hot-reloads in dev, 
    // and provide basic protection in serverless (per-instance)
    const globalStore = global as typeof globalThis & { rateLimits?: Map<string, number> };
    if (!globalStore.rateLimits) {
      globalStore.rateLimits = new Map();
    }
    
    const lastRequestTime = globalStore.rateLimits.get(conversationId);
    if (lastRequestTime && now - lastRequestTime < windowMs) {
      return NextResponse.json(
        { error: 'Please wait a few seconds before sending another message.' },
        { status: 429, headers: CORS_HEADERS }
      );
    }
    globalStore.rateLimits.set(conversationId, now);

    // Fetch previous messages for conversation history
    const { data: pastMessages } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    const history = (pastMessages || []).map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

    // 2. Build system prompt — merge ALL knowledge_base rows + structured fields
    const knowledgeContent = (business.knowledge_base as any[] || [])
      .map((kb: { content: string }) => kb.content)
      .filter(Boolean)
      .join('\n\n---\n\n') || 'No information available yet.';

    const systemPrompt = `
You are Sami, a friendly and professional real estate assistant for ${business.name}.
Your job is to help potential buyers and renters discover properties, answer questions, and connect them with the agency.

RESPONSE LANGUAGE — follow strictly:
- User writes in French → reply in French only
- User writes in Arabic or Tunisian Darija → reply in Tunisian Darija only (use: bich, taabi, chhal, win, kifchrih, manich mouchkil)
- User writes in English → reply in English only
- Never mix languages in a single reply

PERSONALITY:
- Warm, professional, patient — never pushy
- Use Tunisian real estate vocabulary naturally: villa, S+1/S+2/S+3, appartement, duplex, terrain, TND, loyer mensuel, prix de vente

BUSINESS KNOWLEDGE:
${knowledgeContent}
${business.description ? `\nABOUT THE AGENCY:\n${business.description}` : ''}
${business.hours ? `\nBUSINESS HOURS:\n${business.hours}` : ''}
${business.phone ? `\nCONTACT PHONE: ${business.phone}` : ''}
${business.whatsapp ? `\nWHATSAPP: ${business.whatsapp}` : ''}

YOUR PRIMARY JOB:
Answer questions using only the BUSINESS KNOWLEDGE above. Be helpful, conversational, and warm.
For greetings like "bonjour", "salam", "hi" — greet them back and ask how you can help.
For general questions about properties, hours, location — answer from your knowledge base.
For vague queries — ask clarifying questions: zone? budget? nombre de pièces?

PROPERTY QUERIES:
- Describe matching properties from your knowledge base briefly and clearly
- If no match: "Notre équipe peut vérifier les disponibilités pour vous."

LEAD CAPTURE — USE SPARINGLY:
Call the request_customer_contact tool ONLY when ALL of these are true:
1. The visitor has shown CLEAR intent to buy, rent, or visit a property
2. The conversation has progressed beyond a simple greeting or question
3. The visitor explicitly says something like:
   - "I want to schedule a visit" / "Nheb nchof dar"
   - "I'm interested in buying this" / "Nheb nchrih"
   - "Can you contact me?" / "Naatokom numeri?"
   - "I want to book an appointment" / "Nheb na3mel rendez-vous"

Do NOT call the tool for:
- Greetings (bonjour, salam, hi, bnjour)
- General questions (who are you, what do you do, where are you located)
- Price inquiries without buying intent
- Casual browsing questions

STRICT RULES — never break these:
- NEVER invent listings, prices, availability, or details not in your knowledge base
- NEVER give legal, notarial, or financial advice
- NEVER mention competitors
- If you don't know: "Je n'ai pas cette information, mais notre équipe peut vous répondre directement."
- When you DO call the tool, also respond with a friendly message — do NOT only call the tool
`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: sanitizedMessage },
    ];

    // P2: Use llama3-70b-8192 for more reliable tool calling
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'request_customer_contact',
            description: 'Call this ONLY when the user explicitly asks to schedule a visit, book an appointment, be contacted, or clearly states intent to buy/rent. NEVER call for greetings, general questions, price inquiries, or casual browsing.',
            parameters: { type: 'object', properties: {} },
          },
        },
      ],
      tool_choice: 'auto',
      max_tokens: 500,
    });

    const responseMessage = response.choices[0].message;
    let reply = responseMessage.content;
    let action = null;

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      if (toolCall.type === 'function' && toolCall.function.name === 'request_customer_contact') {
        action = 'SHOW_LEAD_FORM';
        // P1-2: Always provide text so we always save to messages
        reply = reply || "Avec plaisir ! Notre équipe va vous contacter directement.";
      }
    }

    // P1-2: Always ensure a text reply — never skip saving messages
    reply = reply || "Je suis là pour vous aider. Comment puis-je vous assister ?";

    // 3. Save conversation to Supabase
    await supabaseAdmin.from('conversations').upsert(
      { id: conversationId, business_id: business.id },
      { onConflict: 'id' }
    );

    // Always save both turns
    await supabaseAdmin.from('messages').insert([
      { conversation_id: conversationId, role: 'user', content: sanitizedMessage },
      { conversation_id: conversationId, role: 'assistant', content: reply },
    ]);

    return NextResponse.json({ reply, action }, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
