import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Cleanup Old Drafts Edge Function
 *
 * Deletes draft submissions older than 30 days.
 * Schedule: Weekly (Sundays at midnight) via Supabase cron
 *
 * To set up the cron job in Supabase:
 * 1. Go to Database > Extensions > Enable pg_cron
 * 2. Run:
 *    SELECT cron.schedule(
 *      'cleanup-old-drafts',
 *      '0 0 * * 0',  -- Every Sunday at midnight
 *      $$
 *      SELECT net.http_post(
 *        url := '<YOUR_PROJECT_URL>/functions/v1/cleanup-old-drafts',
 *        headers := '{"Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb
 *      )
 *      $$
 *    );
 */

const DAYS_TO_KEEP = 30;

Deno.serve(async (req: Request) => {
  try {
    // Verify the request is authorized (service role key required)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
    const cutoffISOString = cutoffDate.toISOString();

    console.log(`[cleanup-old-drafts] Deleting drafts older than ${cutoffISOString}`);

    // Delete old drafts
    const { data, error, count } = await supabase
      .from('onboarding_submissions')
      .delete()
      .eq('submission_status', 'draft')
      .lt('updated_at', cutoffISOString)
      .select('id');

    if (error) {
      console.error('[cleanup-old-drafts] Error deleting drafts:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const deletedCount = data?.length || 0;
    console.log(`[cleanup-old-drafts] Successfully deleted ${deletedCount} old drafts`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${deletedCount} drafts older than ${DAYS_TO_KEEP} days`,
        deletedCount,
        cutoffDate: cutoffISOString
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('[cleanup-old-drafts] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
