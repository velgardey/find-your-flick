import { GoogleGenerativeAI } from "@google/generative-ai";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

export async function generateMovieRecommendations(
  description: string, 
  selectedMovies: Movie[], 
  count: number = 10
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

  const prompt = `As a movie recommendation expert, suggest ${count} movie${count > 1 ? 's' : ''} based on the following description and selected movies. 
  Only return the movie titles separated by commas, without any additional text or explanation.
  
  Description: ${description}
  Selected movies: ${selectedMovies.map(m => m.title).join(', ')}
  
  Remember to:
  1. Only return movie titles
  2. Separate titles with commas
  3. Return exactly ${count} movie${count > 1 ? 's' : ''}
  4. Don't include any other text`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.split(',').map(title => title.trim()).filter(title => title.length > 0);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
} 