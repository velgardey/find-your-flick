# Find Your Flick 🎬

A modern movie recommendation engine that helps you discover your next favorite film. Built with an elegant UI and powered by cutting-edge technology, Find Your Flick makes movie exploration a delightful experience.

![Next.js](https://img.shields.io/badge/Next.js-13-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)

## ✨ Features

- **Personalized Movie Recommendations**: Get tailored movie suggestions based on your watching history and preferences
- **Social Movie Experience**: 
  - Connect with friends and share movie recommendations
  - See what your friends are watching
  - Send and receive movie suggestions
- **Smart Search**: Find movies quickly with our intelligent search functionality
- **Watchlist Management**: 
  - Keep track of movies you want to watch
  - Organize your watched movies
  - Rate and review films
- **Beautiful UI/UX**:
  - Modern, responsive design
  - Smooth animations and transitions
  - Dark mode optimized interface

## 🛠️ Tech Stack

- **Frontend**:
  - Next.js 13 (App Router)
  - TypeScript
  - Tailwind CSS
  - Framer Motion
  - Headless UI
  - React Icons

- **Backend**:
  - Next.js API Routes
  - Prisma ORM
  - PostgreSQL
  - Authentication (NextAuth.js)

- **Development Tools**:
  - ESLint
  - Prettier
  - Husky (Git Hooks)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/find-your-flick.git
cd find-your-flick
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/findyourflick"
NEXTAUTH_SECRET="your-secret-here"
TMDB_API_KEY="your-tmdb-api-key"
```

5. Run database migrations:
```bash
npx prisma migrate dev
```

6. Start the development server:
```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to see the application running!

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for providing the movie database API
- All the amazing contributors and users of Find Your Flick

---

Made with ❤️ by velgardey
