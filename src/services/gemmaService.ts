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

  const prompt = `You are an expert film curator with deep knowledge of cinema across all genres, eras, and cultures. Analyze the following input and recommend ${count} exceptional movies.

Context:
Description: ${description}
Selected movies: ${selectedMovies.map(m => m.title).join(', ')}

Task:
Generate exactly ${count} movie recommendations that align with the following criteria, listed in order of priority:

1. If the description contains a specific movie title, ENSURE that movie is included in the recommendations.

2. Analyze the provided movies for:
   - Core themes and motifs
   - Emotional tone and atmosphere
   - Visual and directorial style
   - Narrative structure
   - Character dynamics
   - Genre elements and subversions

3. Prioritize movies that meet these quality benchmarks:
   - Minimum 7.0 IMDb rating OR equivalent on Letterboxd/Metacritic
   - Strong critical reception or cult following
   - Unique artistic vision or innovative approach
   - Cultural impact or historical significance
   - Memorable performances or technical achievements

4. Consider these additional factors:
   - Thematic resonance with the description
   - Similar emotional impact to selected movies
   - Varied release years to include both classics and modern films
   - Mix of mainstream and lesser-known gems
   - Geographic and cultural diversity when relevant
   - Directors' other notable works if pattern emerges

5. Avoid:
   - Low-quality derivatives or imitations
   - Movies with poor production values
   - Critically panned releases
   - Obvious or cliched choices unless specifically relevant

Output Instructions:
- Return ONLY the movie titles
- Separate titles with commas
- Include exactly ${count} recommendations
- No additional text or explanations
- If a specific movie was mentioned in the description, it MUST be included

Response Format:
Movie 1, Movie 2, Movie 3, etc.`;

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