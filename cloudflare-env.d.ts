declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    FIREBASE_WEB_CONFIG?: string;
    BUCKET?: R2Bucket;
  }
}
