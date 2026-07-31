/* ============================================
 * Supabase 配置 —— 按 SETUP-INBOX.md 建好项目后，
 * 把下面两个值替换成你的 Project URL 和 anon public key。
 * anon key 是公开的，真正的安全由数据库 RLS 策略保证。
 * ============================================ */

const SUPABASE_URL = "https://xjxiecxyfeekdxjtjasa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqeGllY3h5ZmVla2R4anRqYXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MzgyNTIsImV4cCI6MjEwMDAxNDI1Mn0.KiWwm2Wesy6JnkiZZz2CbCezg-IbNh1dKTy_7_p41yQ";

/* 生活碎碎念发布密钥：和 SETUP-INBOX.md 里 life_moments 表的 RLS 策略保持一致。
 * 只能挡随手捣乱，挡不住认真看源码的人——和整站的轻量登录模型一致。 */
const LIFE_SECRET = "lm_x7k9q2w8f3";
