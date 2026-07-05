import { createClient } from '@supabase/supabase-js';
import { RecommendationState } from '../types';

function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    // If it's a supabase.co URL, use the origin to strip paths like /rest/v1
    if (parsed.hostname.endsWith('supabase.co')) {
      return parsed.origin;
    }
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
      return parsed.origin;
    }
    let cleanUrl = trimmed;
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    const suffixes = ['/rest/v1', '/auth/v1', '/v1'];
    for (const suffix of suffixes) {
      if (cleanUrl.endsWith(suffix)) {
        cleanUrl = cleanUrl.slice(0, -suffix.length);
      }
    }
    return cleanUrl;
  } catch (e) {
    let cleanUrl = trimmed;
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    return cleanUrl;
  }
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
export const supabaseAnonKey = rawKey;

// Check common mistakes:
const isPlaceholder = rawUrl.includes('your-supabase-project') || rawUrl === '';
const isPostgresProtocol = rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://');
const isDbHost = rawUrl.includes('db.') || rawUrl.includes(':5432') || rawUrl.includes(':6543');
const isMissingHttps = rawUrl !== '' && !rawUrl.startsWith('https://') && !rawUrl.startsWith('http://');

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !isPlaceholder && 
  !isPostgresProtocol && 
  !isDbHost &&
  !isMissingHttps
);

let configWarning: string | null = null;
if (isPlaceholder) {
  configWarning = "You are using placeholder credentials. Please set your own VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Settings > Secrets.";
} else if (isPostgresProtocol || isDbHost) {
  configWarning = "DATABASE CONNECTION STRING DETECTED: It looks like you've pasted the Supabase PostgreSQL database connection URL instead of your Supabase API URL (Project URL). Go to Settings > API in your Supabase dashboard and copy the 'Project URL' (which starts with https://).";
} else if (isMissingHttps) {
  configWarning = "INVALID URL: Your Supabase Project URL must start with 'https://'. Please check your Settings > Secrets configuration.";
} else if (!isSupabaseConfigured) {
  configWarning = "Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing or empty.";
}

export { configWarning };

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase configuration state:",
    configWarning || "Fallback offline mode."
  );
}

export interface UserStats {
  skillLevel: number;
  eloRating: string;
  careerHistory: any[];
  reportCard: any;
  recommendationState: RecommendationState | null;
}

const RECOMMENDATION_STATE_STORAGE_KEY = 'chessCoach_recommendationState';

// Load statistics: tries Supabase table -> falls back to Supabase user_metadata -> falls back to localStorage
export async function loadUserStats(user: any): Promise<UserStats> {
  const localStats: UserStats = {
    skillLevel: parseInt(localStorage.getItem('chess_coach_skill_level') || '1', 10),
    eloRating: localStorage.getItem('chess_coach_elo_rating') || '1200 Elo',
    careerHistory: [],
    reportCard: null,
    recommendationState: null,
  };
  
  try {
    const rawHistory = localStorage.getItem('chess_coach_game_history');
    if (rawHistory) {
      localStats.careerHistory = JSON.parse(rawHistory);
    }
  } catch (e) {
    console.warn('Error parsing local career history:', e);
  }
  
  try {
    const rawReport = localStorage.getItem('chessCoach_reportCard');
    if (rawReport) {
      localStats.reportCard = JSON.parse(rawReport);
    }
  } catch (e) {
    console.warn('Error parsing local report card:', e);
  }

  try {
    const rawRecommendationState = localStorage.getItem(RECOMMENDATION_STATE_STORAGE_KEY);
    if (rawRecommendationState) {
      localStats.recommendationState = JSON.parse(rawRecommendationState);
    }
  } catch (e) {
    console.warn('Error parsing local recommendation state:', e);
  }

  if (!supabase || !user) {
    return localStats;
  }

  // 1. Try to load from "profiles" table
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('skill_level, elo_rating, game_history, report_card, recommendation_state')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data) {
      return {
        skillLevel: data.skill_level ?? localStats.skillLevel,
        eloRating: data.elo_rating ?? localStats.eloRating,
        careerHistory: Array.isArray(data.game_history) ? data.game_history : localStats.careerHistory,
        reportCard: data.report_card ?? localStats.reportCard,
        recommendationState: data.recommendation_state ?? localStats.recommendationState,
      };
    }
  } catch (e) {
    console.warn('Supabase profiles table query skipped or failed, falling back to auth user metadata:', e);
  }

  // 2. Try to load from user_metadata (Auth state)
  const metadata = user.user_metadata || {};
  if (metadata.skillLevel !== undefined) {
    return {
      skillLevel: metadata.skillLevel || 1,
      eloRating: metadata.eloRating || '1200 Elo',
      careerHistory: Array.isArray(metadata.careerHistory) ? metadata.careerHistory : [],
      reportCard: metadata.reportCard || null,
      recommendationState: metadata.recommendationState ?? null,
    };
  }

  return localStats;
}

// Save statistics: saves to localStorage, and if user is logged in, upserts to Supabase table & user_metadata
export async function saveUserStats(user: any, stats: UserStats): Promise<void> {
  // Always persist locally first as immediate fallback
  localStorage.setItem('chess_coach_skill_level', stats.skillLevel.toString());
  localStorage.setItem('chess_coach_elo_rating', stats.eloRating);
  localStorage.setItem('chess_coach_game_history', JSON.stringify(stats.careerHistory));
  if (stats.reportCard) {
    localStorage.setItem('chessCoach_reportCard', JSON.stringify(stats.reportCard));
  }
  if (stats.recommendationState) {
    localStorage.setItem(RECOMMENDATION_STATE_STORAGE_KEY, JSON.stringify(stats.recommendationState));
  }

  if (!supabase || !user) {
    return;
  }

  // 1. Try saving to "profiles" table
  let tableSavedSuccess = false;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        skill_level: stats.skillLevel,
        elo_rating: stats.eloRating,
        game_history: stats.careerHistory,
        report_card: stats.reportCard,
        recommendation_state: stats.recommendationState,
        updated_at: new Date().toISOString(),
      });

    if (!error) {
      tableSavedSuccess = true;
    }
  } catch (e) {
    // Silently continue to metadata update
  }

  // 2. Always backup to user_metadata (this requires zero database table schemas and guarantees sync across devices)
  try {
    await supabase.auth.updateUser({
      data: {
        skillLevel: stats.skillLevel,
        eloRating: stats.eloRating,
        careerHistory: stats.careerHistory,
        reportCard: stats.reportCard,
        recommendationState: stats.recommendationState,
      },
    });
  } catch (e) {
    console.error('Error updating user metadata in Supabase Auth:', e);
  }
}
