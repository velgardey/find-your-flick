import { GoogleGenerativeAI } from "@google/generative-ai";

interface Media {
  id: number;
  title: string;
  poster_path: string;
}

export async function generateMediaRecommendations(
  description: string, 
  selectedMedia: Media[], 
  count: number = 15
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `You are an expert media curator with deep knowledge of both films and television shows across all genres, eras, and cultures. Analyze the following input and recommend ${count} exceptional movies and TV shows.

Context:
Description: ${description}
Selected media: ${selectedMedia.map(m => m.title).join(', ')}

Task:
Generate exactly ${count} movie and TV show recommendations that align with the following criteria, listed in order of priority:

1. If the description contains a specific movie or TV show title, ENSURE that title is included in the recommendations.

2. Analyze the provided media for:
   - Core themes and motifs
   - Emotional tone and atmosphere
   - Visual and directorial style
   - Narrative structure and pacing
   - Character development and dynamics
   - Genre elements and subversions

3. Prioritize movies and TV shows that meet these quality benchmarks:
   - Minimum 7.0 IMDb rating OR equivalent on Letterboxd/Metacritic
   - Strong critical reception or cult following
   - Unique artistic vision or innovative approach
   - Cultural impact or historical significance
   - Memorable performances or technical achievements
   - For TV shows: Strong season-long arcs or episodic excellence

4. Consider these additional factors:
   - Thematic resonance with the description
   - Similar emotional impact to selected media
   - Varied release years to include both classics and modern content
   - Mix of mainstream and lesser-known gems
   - Geographic and cultural diversity when relevant
   - Creators' other notable works if pattern emerges
   - Balance between movies and TV shows based on user preferences

5. Avoid:
   - Low-quality derivatives or imitations
   - Poor production values
   - Critically panned releases
   - Obvious or cliched choices unless specifically relevant
   - Shows that declined significantly in quality
   - Incomplete or prematurely cancelled series

Output Instructions:
- Return ONLY the titles (both movies and TV shows)
- Separate titles with commas
- Include exactly ${count} recommendations
- No additional text or explanations
- If a specific movie or TV show was mentioned in the description, it MUST be included

Response Format:
Movie/Show 1, Movie/Show 2, Movie/Show 3, etc.`;

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