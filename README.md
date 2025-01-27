# Find Your Flick 🎬

> **[Visit Find Your Flick](https://find-your-flick.vercel.app)** - Your AI-powered movie companion for perfect film recommendations!

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-13-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3-38bdf8" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Firebase-11-orange" alt="Firebase" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748" alt="Prisma" />
</div>

Find Your Flick is a cutting-edge movie discovery platform that combines the power of AI with social features to help you find your next favorite movie. Whether you're a casual viewer or a film enthusiast, our platform makes movie exploration engaging and personalized.

## ✨ Features

### 🤖 AI-Powered Movie Discovery
- Get personalized movie recommendations using our advanced AI algorithm
- Chat with our AI assistant to find movies based on your mood, preferences, or specific criteria
- Discover hidden gems that match your taste profile

### 📋 Personal Watchlist Management
- Create and manage your movie watchlist
- Mark movies as watched, plan to watch, or currently watching
- Rate and review films you've seen
- Track your watching history

### 👥 Social Features
- Follow other movie enthusiasts
- Share movie recommendations with friends
- See what movies your friends are watching
- Engage in discussions about your favorite films

### 🎨 Modern User Experience
- Beautiful, responsive design that works on all devices
- Dark mode by default for comfortable viewing
- Smooth animations powered by Framer Motion
- Real-time search and filtering capabilities
- Streaming service availability information

## 🛠️ Tech Stack

### Frontend
- **Next.js 13** with App Router for modern React development
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for smooth animations
- **Headless UI** for accessible components
- **React Icons** for beautiful icons

### Backend & Database
- **Firebase** for authentication
- **Prisma** with PostgreSQL for data management
- **Supabase** for real-time features
- **TMDB API** for movie data

### AI & Machine Learning
- **Google Generative AI** for smart recommendations
- **Custom recommendation algorithms**

### Development Tools
- **ESLint** & **TypeScript** for code quality
- **PNPM** for fast, efficient package management
- **Vercel** for deployment and hosting

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PNPM package manager
- PostgreSQL database
- Firebase account
- TMDB API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/find-your-flick.git
cd find-your-flick
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/findyourflick"
NEXT_PUBLIC_TMDB_API_KEY="your-tmdb-api-key"
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-firebase-auth-domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"
```

5. Run database migrations:
```bash
pnpm prisma migrate dev
```

6. Start the development server:
```bash
pnpm dev
```

Visit `http://localhost:3000` to see the application running!

## 🌟 Key Features in Detail

### Movie Search and Discovery
- Advanced search functionality with real-time suggestions
- Detailed movie information including streaming availability
- Trailer playback support
- Comprehensive movie details including cast, ratings, and release info

### Watchlist Management
- Multiple watch status options (Watching, Completed, Plan to Watch)
- Search and filter your watchlist
- Quick actions to update watch status
- Progress tracking

### User Experience
- Responsive design for all screen sizes
- Beautiful animations and transitions
- Intuitive navigation
- Fast and efficient performance

## 📱 Mobile Experience
Find Your Flick is fully optimized for mobile devices with:
- Touch-friendly interface
- Native-like animations
- Optimized performance
- Responsive images and layouts

## 🔒 Security Features
- Secure authentication with Firebase
- Protected API routes
- Environment variable protection
- Data encryption

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🌐 Live Demo
Visit [Find Your Flick](https://find-your-flick.vercel.app) to try it out!

---

Made with ❤️ by velgardey
