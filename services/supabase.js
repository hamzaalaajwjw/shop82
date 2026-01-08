import { createClient } from "@supabase/supabase-js";
import { SUPABASE } from "../config/keys.js";

export const supabase = createClient(SUPABASE.url, SUPABASE.anonKey);
