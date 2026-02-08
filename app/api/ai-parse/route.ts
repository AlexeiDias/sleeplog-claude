//app/api/ai-parse/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI assistant for a daycare app called SleepLog. Your job is to parse natural language commands from daycare staff and extract structured data.

The staff can log the following types of entries:

1. SLEEP ACTIONS:
   - sleep_start: Start sleep/nap for a child
   - sleep_check: Check on a sleeping child
   - sleep_stop: End sleep/wake up a child

2. CARE ACTIONS:
   - diaper: Log a diaper change
   - bottle: Log bottle feeding
   - meal: Log a meal

3. ACTIVITY ACTIONS:
   - activity: Log an activity

FIELDS BY ACTION TYPE:

sleep_start/sleep_check:
- childName (required): The child's name
- position (optional): Back, Side, Tummy (default: Back)
- breathing (optional): Normal, Labored, Congested (default: Normal)
- notes (optional): Any additional notes

sleep_stop:
- childName (required): The child's name
- position (optional): Back, Side, Tummy, Seating, Standing
- breathing (optional): Normal, Labored, Congested (default: Normal)
- mood (optional): Happy, Neutral, Fussy, Upset, Crying (default: Happy)
- notes (optional): Any additional notes

diaper:
- childName (required): The child's name
- diaperType (required): dry, wet, solid, both
- notes (optional): Any additional notes

bottle:
- childName (required): The child's name
- amount (required): Amount in oz (number)
- notes (optional): Any additional notes

meal:
- childName (required): The child's name
- ingredients (required): What they ate
- amount (optional): Amount in oz (number)
- notes (optional): Any additional notes

activity:
- childName (required): The child's name
- category (optional): Category name
- activityName (required): Name of the activity
- duration (optional): Duration in minutes
- notes (optional): Any additional notes

RESPONSE FORMAT:
Always respond with valid JSON only, no other text. Use this format:

{
  "success": true,
  "action": "sleep_start|sleep_check|sleep_stop|diaper|bottle|meal|activity",
  "data": {
    // fields based on action type
  },
  "confirmMessage": "A friendly message confirming what will be logged"
}

If you cannot parse the command or it's unclear:
{
  "success": false,
  "error": "Explanation of what's unclear",
  "suggestion": "A suggestion for how to phrase it better"
}

EXAMPLES:

Input: "Emma nap started on back"
Output: {"success":true,"action":"sleep_start","data":{"childName":"Emma","position":"Back","breathing":"Normal"},"confirmMessage":"Starting nap for Emma (on back, breathing normal)"}

Input: "wet diaper for lucas"
Output: {"success":true,"action":"diaper","data":{"childName":"Lucas","diaperType":"wet"},"confirmMessage":"Logging wet diaper for Lucas"}

Input: "Adelaide had 5oz bottle"
Output: {"success":true,"action":"bottle","data":{"childName":"Adelaide","amount":5},"confirmMessage":"Logging 5oz bottle for Adelaide"}

Input: "lunch for emma oatmeal and bananas"
Output: {"success":true,"action":"meal","data":{"childName":"Emma","ingredients":"oatmeal and bananas"},"confirmMessage":"Logging lunch for Emma: oatmeal and bananas"}

Input: "emma woke up happy"
Output: {"success":true,"action":"sleep_stop","data":{"childName":"Emma","mood":"Happy","position":"Back","breathing":"Normal"},"confirmMessage":"Ending nap for Emma (woke up happy)"}

Input: "emma did puzzles for 20 minutes"
Output: {"success":true,"action":"activity","data":{"childName":"Emma","activityName":"Puzzles","duration":20},"confirmMessage":"Logging activity for Emma: Puzzles (20 min)"}

Be flexible with phrasing. "nap", "sleep", "put down" all mean sleep_start. "woke up", "awake", "up" mean sleep_stop.
For names, match partial names or nicknames when possible (e.g., "Addy" could be "Adelaide").`;

export async function POST(request: NextRequest) {
  try {
    const { message, childrenNames } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'No message provided' },
        { status: 400 }
      );
    }

    // Add children names context to help with matching
    const contextMessage = childrenNames?.length 
      ? `Available children in this daycare: ${childrenNames.join(', ')}.\n\nUser command: ${message}`
      : message;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: contextMessage,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON response
    const parsed = JSON.parse(textContent.text);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('AI Parse error:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response',
      });
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process command' },
      { status: 500 }
    );
  }
}
