-- IPU Promise App Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promises table
CREATE TABLE IF NOT EXISTS promises (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    deadline TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    category VARCHAR(100) DEFAULT 'personal',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements table (junction)
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    achievement_id INTEGER REFERENCES achievements(id),
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    promise_id INTEGER REFERENCES promises(id),
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('created', 'completed', 'failed', 'achievement_unlocked')),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_promises_user_id ON promises(user_id);
CREATE INDEX IF NOT EXISTS idx_promises_status ON promises(status);
CREATE INDEX IF NOT EXISTS idx_promises_public ON promises(is_public);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Insert default achievements
INSERT INTO achievements (key, title, description, icon) VALUES
    ('first_promise', 'Первый шаг', 'Создано первое обещание', 'Footprints'),
    ('first_complete', 'Выполнено!', 'Выполнено первое обещание', 'CheckCircle'),
    ('week_streak', 'Неделя побед', 'Выполнено 5 обещаний за неделю', 'Trophy'),
    ('month_streak', 'Постоянство', 'Выполняйте обещания 30 дней подряд', 'Flame'),
    ('master_50', 'Мастер слова', 'Выполнено 50 обещаний', 'Crown'),
    ('social_share', 'Вдохновение', 'Поделитесь достижением с друзьями', 'Share2')
ON CONFLICT (key) DO NOTHING;