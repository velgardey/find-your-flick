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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are an elite media recommendation expert with comprehensive knowledge of global ${mediaType === 'movie' ? 'cinema' : 'television'}, incorporating data from multiple rating platforms, critic reviews, and audience reception. Your recommendations are based on sophisticated analysis of viewer preferences, cultural impact, and artistic merit. Analyze the following input to recommend ${count} exceptional ${mediaType === 'movie' ? 'films' : 'TV series'} that precisely match the given criteria.

Input Analysis:
User Description: ${description}
Selected ${mediaType === 'movie' ? 'Films' : 'Series'}: ${selectedMedia.map(m => m.title).join(', ')}

Primary Directive:
Generate exactly ${count} meticulously curated ${mediaType === 'movie' ? 'film' : 'TV series'} recommendations adhering to these hierarchical criteria:

1. Explicit Title Handling:
   - If the description mentions specific titles, they MUST be included
   - Analyze any mentioned titles for their key characteristics to inform other recommendations

2. Rating Aggregation (Minimum Thresholds):
   ${mediaType === 'movie' ? `- IMDb: 7.0+ weighted average
   - Letterboxd: 3.5+ average rating
   - Metacritic: 70+ metascore
   - Rotten Tomatoes: 75%+ critic score or 80%+ audience score` 
   : 
   `- IMDb: 7.0+ weighted average
   - TV Time: 85%+ rating
   - Rotten Tomatoes: 75%+ critic score or 80%+ audience score
   - Metacritic: 70+ metascore for key seasons`}

3. Deep Content Analysis:
   A. Thematic Elements:
      - Core themes and philosophical undertones
      - Emotional resonance and psychological depth
      - Cultural and societal commentary
      - Genre innovations and subversions

   B. Technical Excellence:
      - Cinematography and visual composition
      - Sound design and musical score
      - Production design and world-building
      - ${mediaType === 'movie' ? 'Editing and pacing' : 'Episode structure and season arcs'}

   C. Narrative Components:
      - Story complexity and coherence
      - Character development depth
      - Dialog quality and subtlety
      - ${mediaType === 'movie' ? 'Plot resolution satisfaction' : 'Season-to-season narrative progression'}

4. Audience and Critical Reception:
   - Professional critic consensus
   - Audience sentiment analysis
   - Awards and recognition
   - Cultural impact and longevity
   - Online community discussions and analysis
   - ${mediaType === 'tv' ? 'Season-by-season reception trends' : 'Post-release critical reappraisal'}

5. Advanced Matching Criteria:
   A. Content Attributes:
      - Tone and atmosphere alignment
      - Pacing and runtime considerations
      - Visual style and aesthetic approach
      - ${mediaType === 'tv' ? 'Episode length and season structure' : 'Narrative structure and act composition'}

   B. Contextual Factors:
      - Historical and cultural significance
      - Innovation and influence on the medium
      - Creator/Director's artistic vision
      - Genre-defining or genre-blending elements

   C. Accessibility Factors:
      - Availability on major streaming platforms
      - Language and subtitle availability
      - ${mediaType === 'tv' ? 'Series completion status' : 'International release status'}

6. Quality Control Exclusions:
   - Productions with significant quality inconsistencies
   - Poorly received remakes or derivatives
   - ${mediaType === 'tv' ? `- Series with unresolved major plotlines
   - Shows with dramatic quality decline
   - Prematurely cancelled series
   - Shows with inconsistent creative vision` 
   : 
   `- Poor quality franchise entries
   - Critically panned remakes
   - Films with major production issues
   - Direct-to-video releases (unless critically acclaimed)`}

Output Requirements:
- Return EXACTLY ${count} titles
- Format: Title 1, Title 2, Title 3, etc.
- Include ONLY the titles, no explanations
- Ensure mentioned titles from description are included
- Maintain strict quality standards for all recommendations

Response Format:
${mediaType === 'movie' ? 'Film 1, Film 2, Film 3, etc.' : 'Series 1, Series 2, Series 3, etc.'}`;

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