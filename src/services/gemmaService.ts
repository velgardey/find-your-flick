import { GoogleGenerativeAI } from "@google/generative-ai";

interface Media {
  id: number;
  title: string;  // movie.title or tvShow.name
  name?: string;  // for TV shows
  poster_path: string;
  media_type: 'movie' | 'tv';
}

export async function generateMediaRecommendations(
  description: string, 
  selectedMedia: Media[], 
  count: number = 15,
  mediaType: 'movie' | 'tv'
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `You are an expert media curator with deep knowledge of ${mediaType === 'movie' ? 'films' : 'television shows'} across all genres, eras, and cultures. Analyze the following input and recommend ${count} exceptional ${mediaType === 'movie' ? 'movies' : 'TV shows'}.

Context:
Description: ${description}
Selected ${mediaType === 'movie' ? 'movies' : 'TV shows'}: ${selectedMedia.map(m => m.title).join(', ')}

Task:
Generate exactly ${count} ${mediaType === 'movie' ? 'movie' : 'TV show'} recommendations that align with the following criteria, listed in order of priority:

1. If the description contains a specific ${mediaType === 'movie' ? 'movie' : 'TV show'} title, ENSURE that title is included in the recommendations.

2. Analyze the provided ${mediaType === 'movie' ? 'movies' : 'TV shows'} for:
   - Core themes and motifs
   - Emotional tone and atmosphere
   - Visual and directorial style
   - Narrative structure and pacing
   - Character development and dynamics
   - Genre elements and subversions
   ${mediaType === 'tv' ? '- Season-long arcs and episode quality\n   - Series progression and consistency' : ''}

3. Prioritize ${mediaType === 'movie' ? 'movies' : 'TV shows'} that meet these quality benchmarks:
   - Minimum 7.0 IMDb rating OR equivalent on ${mediaType === 'movie' ? 'Letterboxd/Metacritic' : 'TV Time/Rotten Tomatoes'}
   - Strong critical reception or cult following
   - Unique artistic vision or innovative approach
   - Cultural impact or historical significance
   - Memorable performances or technical achievements
   ${mediaType === 'tv' ? '- Satisfying series progression\n   - Strong season-to-season quality\n   - Proper series conclusion (if ended)' : ''}

4. Consider these additional factors:
   - Thematic resonance with the description
   - Similar emotional impact to selected media
   - Varied release years to include both classics and modern content
   - Mix of mainstream and lesser-known gems
   - Geographic and cultural diversity when relevant
   - Creators' other notable works if pattern emerges
   ${mediaType === 'tv' ? '- Series length and commitment level\n   - Seasonal structure and pacing' : ''}

5. Avoid:
   - Low-quality derivatives or imitations
   - Poor production values
   - Critically panned releases
   - Obvious or cliched choices unless specifically relevant
   ${mediaType === 'tv' ? '- Shows that declined significantly in quality\n   - Incomplete or prematurely cancelled series\n   - Shows with unresolved major plotlines' : ''}

Output Instructions:
- Return ONLY the titles
- Separate titles with commas
- Include exactly ${count} recommendations
- No additional text or explanations
- If a specific ${mediaType === 'movie' ? 'movie' : 'TV show'} was mentioned in the description, it MUST be included

Response Format:
${mediaType === 'movie' ? 'Movie 1, Movie 2, Movie 3, etc.' : 'TV Show 1, TV Show 2, TV Show 3, etc.'}`;

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