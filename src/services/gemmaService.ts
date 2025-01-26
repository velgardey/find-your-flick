import { GoogleGenerativeAI } from "@google/generative-ai";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

export async function generateMovieRecommendations(
  description: string, 
  selectedMovies: Movie[], 
  count: number = 15
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `As a movie recommendation expert, analyze and suggest ${count} movie${count > 1 ? 's' : ''} based on the following description and selected movies.
Only return movie titles separated by commas, without any additional text or explanation.

Description: ${description}
Selected movies: ${selectedMovies.map(m => m.title).join(', ')}

When making recommendations:
1. Analyze the plot elements, themes, tone, and style of the selected movies
2. Consider highly-rated movies (minimum 7.0 on IMDb or equivalent ratings on Letterboxd/Metacritic)
3. Prioritize movies that have received critical acclaim or strong audience reception
4. Focus on thematic and stylistic similarities rather than just surface-level genre matching
5. Consider the cultural impact and lasting influence of recommended movies
6. Ensure recommendations maintain consistent quality and tone with the selected movies

Remember to:
1. Only return movie titles
2. Separate titles with commas
3. Return exactly ${count} movie${count > 1 ? 's' : ''}
4. Don't include any other text
5. If the user has entered the name of a movie, pick that movie among the list of recommended movies`
;

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