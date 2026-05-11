export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  extractedEmail?: string;
  customUrl?: string;
  thumbnailUrl: string;
  publishedAt: string;
  country?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
}

export interface SearchParams {
  q: string;
  order?: string;
  regionCode?: string;
  relevanceLanguage?: string;
  pageToken?: string;
  minSubs?: number;
  maxSubs?: number;
}

export interface SearchResult {
  channels: YouTubeChannel[];
  nextPageToken?: string;
  totalResults?: number;
  quotaExceeded?: boolean;
}

// Fallback mock data when no API key is provided
const MOCK_CHANNELS: YouTubeChannel[] = [
  {
    id: "UCwRXb5dUK4cvsHbx-rGzSgw",
    title: "CodeAesthetic",
    description: "Creating aesthetic, easily understandable code. Tips for structure, design patterns, and cleaner code bases. Contact at hello@codeaesthetic.com",
    extractedEmail: "hello@codeaesthetic.com",
    customUrl: "@codeaesthetic",
    thumbnailUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=200&auto=format&fit=crop",
    publishedAt: "2021-05-12T10:00:00Z",
    country: "US",
    subscriberCount: 845000,
    videoCount: 42,
    viewCount: 42300000
  },
  {
    id: "UC29ju8bIPH5as8OGnQzwJyA",
    title: "Traversy Media",
    description: "Web development and programming tutorials for all of the latest web technologies from the building blocks of HTML, CSS & JavaScript to frontend frameworks.",
    customUrl: "@traversymedia",
    thumbnailUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=200&auto=format&fit=crop",
    publishedAt: "2009-10-31T00:00:00Z",
    country: "US",
    subscriberCount: 2210000,
    videoCount: 978,
    viewCount: 204000000
  },
  {
    id: "UCFbNIlppjAuEX4znoulh0Cw",
    title: "Web Dev Simplified",
    description: "Web Dev Simplified is all about teaching web development skills and techniques in an efficient and practical manner.",
    customUrl: "@webdevsimplified",
    thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=200&auto=format&fit=crop",
    publishedAt: "2018-05-23T00:00:00Z",
    country: "US",
    subscriberCount: 1530000,
    videoCount: 450,
    viewCount: 98000000
  },
  {
    id: "UC_mYaQAE6-71rjSN8080Cig",
    title: "Fireship",
    description: "High-intensity code tutorials to help you build & ship your app faster. Subscribe for new videos every week.",
    customUrl: "@fireship",
    thumbnailUrl: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=200&auto=format&fit=crop",
    publishedAt: "2017-06-21T00:00:00Z",
    country: "US",
    subscriberCount: 2850000,
    videoCount: 560,
    viewCount: 310000000
  },
  {
    id: "UCP8Qy0VXJUzE8MCJdqARrtA",
    title: "Kevin Powell",
    description: "Helping you learn how to build the web, and how to write CSS with confidence.",
    customUrl: "@kevinpowell",
    thumbnailUrl: "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?q=80&w=200&auto=format&fit=crop",
    publishedAt: "2014-06-03T00:00:00Z",
    country: "CA",
    subscriberCount: 885000,
    videoCount: 750,
    viewCount: 65000000
  },
  {
    id: "UCXvN_mGEAmJ_5F2YQd2y3vw",
    title: "Hussein Nasser",
    description: "Software engineering, backend, databases, and networking architectural discussions.",
    customUrl: "@husseinnasser",
    thumbnailUrl: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=200&auto=format&fit=crop",
    publishedAt: "2014-09-17T00:00:00Z",
    country: "US",
    subscriberCount: 382000,
    videoCount: 420,
    viewCount: 24000000
  }
];

export async function searchChannels(params: SearchParams): Promise<SearchResult> {
  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  
  if (!API_KEY) {
    // Return mock data if no API key
    console.warn("No VITE_YOUTUBE_API_KEY found. Returning mock data.");
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let results = [...MOCK_CHANNELS];
    
    if (params.q) {
      const q = params.q.toLowerCase();
      results = results.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.description.toLowerCase().includes(q)
      );
    }
    
    if (params.regionCode && params.regionCode !== 'ignore') {
      results = results.filter(c => c.country === params.regionCode);
    }

    if (params.minSubs !== undefined) {
      results = results.filter(c => c.subscriberCount !== undefined && c.subscriberCount >= params.minSubs!);
    }
    
    if (params.maxSubs !== undefined) {
      results = results.filter(c => c.subscriberCount !== undefined && c.subscriberCount <= params.maxSubs!);
    }
    
    return { channels: results, totalResults: results.length };
  }

  // Real YouTube Data API Fetch
  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.append('part', 'snippet');
    searchUrl.searchParams.append('type', 'channel');
    searchUrl.searchParams.append('maxResults', '50');
    searchUrl.searchParams.append('key', API_KEY);
    
    if (params.q) searchUrl.searchParams.append('q', params.q);
    if (params.order) {
      // YouTube Data API 'search' doesn't support 'subscriberCount'.
      // 'viewCount' is a close proxy to find large channels.
      const apiOrder = params.order === 'subscriberCount' ? 'viewCount' : params.order;
      searchUrl.searchParams.append('order', apiOrder);
    }
    if (params.regionCode && params.regionCode !== 'ignore') searchUrl.searchParams.append('regionCode', params.regionCode);
    if (params.relevanceLanguage && params.relevanceLanguage !== 'ignore') searchUrl.searchParams.append('relevanceLanguage', params.relevanceLanguage);

    let matchingChannels: YouTubeChannel[] = [];
    let currentToken = params.pageToken;
    let fetchedPages = 0;
    let lastSearchData: any = {};
    const MAX_PAGES = 5; // Fetch up to 5 pages (250 channels) per request to find matches
    
    while (fetchedPages < MAX_PAGES) {
      if (currentToken) searchUrl.searchParams.set('pageToken', currentToken);
      else searchUrl.searchParams.delete('pageToken');

      const searchRes = await fetch(searchUrl.toString());
      if (!searchRes.ok) {
        let errorData: any;
        try {
          errorData = await searchRes.json();
        } catch (e) {
             throw new Error(`YouTube Search API Error: ${searchRes.statusText}`);
        }
        let errorMsg = errorData?.error?.message || searchRes.statusText;
        // Strip HTML tags if present
        errorMsg = errorMsg.replace(/<[^>]*>?/gm, '');
        if (errorMsg.toLowerCase().includes('quota')) {
            errorMsg = "YouTube API Quota Exceeded. Please try again tomorrow or use a different API key.";
        }
        throw new Error(`YouTube Search API Error: ${errorMsg}`);
      }
      const searchData = await searchRes.json();
      lastSearchData = searchData;
      
      if (!searchData.items || searchData.items.length === 0) {
        break;
      }
      
      // Extract channel IDs safely
      const channelIds = searchData.items
        .map((item: any) => item.id?.channelId || item.snippet?.channelId)
        .filter(Boolean);
        
      if (channelIds.length === 0) break;
      
      // API only accepts up to 50 IDs at once, which matches our maxResults
      const statsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
      statsUrl.searchParams.append('part', 'snippet,statistics');
      statsUrl.searchParams.append('id', channelIds.join(','));
      statsUrl.searchParams.append('key', API_KEY);
      
      const statsRes = await fetch(statsUrl.toString());
      if (!statsRes.ok) {
        let errorData: any;
        try {
          errorData = await statsRes.json();
        } catch (e) {
          console.warn("Failed to fetch channel statistics for some items");
          break;
        }
        let errorMsg = errorData?.error?.message || statsRes.statusText;
        errorMsg = errorMsg.replace(/<[^>]*>?/gm, '');
        if (errorMsg.toLowerCase().includes('quota')) {
            throw new Error(`YouTube API Quota Exceeded. Please try again tomorrow or use a different API key.`);
        }
        console.warn("Failed to fetch channel statistics for some items", errorMsg);
        break;
      }
      
      const statsData = await statsRes.json();
      if (statsData.items) {
          let pageChannels = statsData.items.map((item: any) => ({
            id: item.id,
            title: item.snippet?.title || 'Unknown Channel',
            description: item.snippet?.description,
            extractedEmail: item.snippet?.description?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)?.[0],
            customUrl: item.snippet?.customUrl,
            thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
            publishedAt: item.snippet?.publishedAt,
            country: item.snippet?.country || 'Unknown',
            subscriberCount: parseInt(item.statistics?.subscriberCount || '0'),
            videoCount: parseInt(item.statistics?.videoCount || '0'),
            viewCount: parseInt(item.statistics?.viewCount || '0')
          }));

          // Apply server-side filters to eagerly find matches
          if (params.minSubs !== undefined) {
             pageChannels = pageChannels.filter((c: YouTubeChannel) => c.subscriberCount !== undefined && c.subscriberCount >= params.minSubs!);
          }
          if (params.maxSubs !== undefined) {
             pageChannels = pageChannels.filter((c: YouTubeChannel) => c.subscriberCount !== undefined && c.subscriberCount <= params.maxSubs!);
          }

          matchingChannels = [...matchingChannels, ...pageChannels];
      }
      
      currentToken = searchData.nextPageToken;
      fetchedPages++;
      
      // If we've found enough channels for one page view, we can stop the loop early to save API quota
      if (matchingChannels.length >= 25) {
         break;
      }
      if (!currentToken) break; // No more pages
    }

    if (matchingChannels.length === 0) {
       return { channels: [], totalResults: 0 };
    }

    const uniqueChannelsMap = new Map<string, YouTubeChannel>();
    matchingChannels.forEach(c => {
      if (!uniqueChannelsMap.has(c.id)) {
        uniqueChannelsMap.set(c.id, c);
      }
    });
    
    const channels = Array.from(uniqueChannelsMap.values());

    return {
      channels,
      nextPageToken: lastSearchData.nextPageToken,
      totalResults: lastSearchData.pageInfo?.totalResults
    };
  } catch (error: any) {
    console.error("YouTube API fetching error:", error);
    if (error && error.message && error.message.toLowerCase().includes('quota')) {
      console.warn("Falling back to mock data due to quota exceeded.");
      let results = [...MOCK_CHANNELS];
      if (params.q) {
        const q = params.q.toLowerCase();
        results = results.filter(c => 
          c.title.toLowerCase().includes(q) || 
          c.description.toLowerCase().includes(q)
        );
      }
      if (params.regionCode && params.regionCode !== 'ignore') {
        results = results.filter(c => c.country === params.regionCode);
      }
      if (params.minSubs !== undefined) {
        results = results.filter(c => c.subscriberCount !== undefined && c.subscriberCount >= params.minSubs!);
      }
      if (params.maxSubs !== undefined) {
        results = results.filter(c => c.subscriberCount !== undefined && c.subscriberCount <= params.maxSubs!);
      }
      return { channels: results, totalResults: results.length, quotaExceeded: true };
    }
    throw error;
  }
}
