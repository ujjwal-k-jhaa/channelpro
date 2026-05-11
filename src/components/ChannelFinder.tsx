import { Search, Youtube, Filter, Loader2, AlertCircle, Info, Mail } from 'lucide-react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { searchChannels, YouTubeChannel } from '../lib/youtube';

interface FilterState {
  query: string;
  order: string;
  regionCode: string;
  relevanceLanguage: string;
  minSubs: string;
  maxSubs: string;
}

export default function ChannelFinder() {
  const [queryInput, setQueryInput] = useState('programming');
  const [regionCodeInput, setRegionCodeInput] = useState('');
  const [relevanceLanguageInput, setRelevanceLanguageInput] = useState('');
  const [minSubsInput, setMinSubsInput] = useState('');
  const [maxSubsInput, setMaxSubsInput] = useState('');
  
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    query: 'programming',
    order: 'relevance',
    regionCode: '',
    relevanceLanguage: '',
    minSubs: '',
    maxSubs: ''
  });

  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [totalResults, setTotalResults] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchResults = useCallback(async (loadMore = false, customFilters?: FilterState) => {
    const activeFilters = customFilters || appliedFilters;

    if (!activeFilters.query.trim()) {
      if (!loadMore) {
         setChannels([]);
         setTotalResults(0);
         setNextPageToken(undefined);
         setLoading(false);
         setCurrentPage(1);
      }
      return;
    }
    
    setLoading(true);
    if (!loadMore) {
      setError(null);
      setCurrentPage(1);
    } else {
      setCurrentPage(prev => prev + 1);
    }
    try {
      const result = await searchChannels({
        q: activeFilters.query,
        order: activeFilters.order,
        regionCode: activeFilters.regionCode && activeFilters.regionCode !== 'ignore' ? activeFilters.regionCode : undefined,
        relevanceLanguage: activeFilters.relevanceLanguage && activeFilters.relevanceLanguage !== 'ignore' ? activeFilters.relevanceLanguage : undefined,
        pageToken: loadMore ? nextPageToken : undefined,
        minSubs: activeFilters.minSubs ? parseInt(activeFilters.minSubs, 10) : undefined,
        maxSubs: activeFilters.maxSubs ? parseInt(activeFilters.maxSubs, 10) : undefined,
      });
      
      let fetchedChannels = result.channels;
      
      if (loadMore) {
        setChannels(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newChannels = fetchedChannels.filter(c => !existingIds.has(c.id));
          return [...prev, ...newChannels];
        });
      } else {
        setChannels(fetchedChannels);
      }
      
      setNextPageToken(result.nextPageToken);
      setTotalResults(result.totalResults || 0);
      
      if (result.quotaExceeded) {
         setQuotaExceeded(true);
      } else {
         setQuotaExceeded(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching channels.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, nextPageToken]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
    const newFilters = { 
      ...appliedFilters, 
      query: queryInput,
      regionCode: regionCodeInput,
      relevanceLanguage: relevanceLanguageInput,
      minSubs: minSubsInput,
      maxSubs: maxSubsInput
    };
    setAppliedFilters(newFilters);
    fetchResults(false, newFilters);
  };

  const handleSortChange = (newOrder: string) => {
    setHasSearched(true);
    const newFilters = { ...appliedFilters, order: newOrder };
    setAppliedFilters(newFilters);
    fetchResults(false, newFilters);
  };

  const sortedAndFilteredChannels = useMemo(() => {
    let result = [...channels];
    
    if (appliedFilters.minSubs) {
       const min = parseInt(appliedFilters.minSubs, 10);
       if (!isNaN(min)) {
          result = result.filter(c => c.subscriberCount !== undefined && c.subscriberCount >= min);
       }
    }
    if (appliedFilters.maxSubs) {
       const max = parseInt(appliedFilters.maxSubs, 10);
       if (!isNaN(max)) {
          result = result.filter(c => c.subscriberCount !== undefined && c.subscriberCount <= max);
       }
    }

    if (appliedFilters.order === 'subscriberCount') {
      result.sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0));
    } else if (appliedFilters.order === 'date') {
      result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
    
    return result;
  }, [channels, appliedFilters.order, appliedFilters.minSubs, appliedFilters.maxSubs]);

  return (
    <div className="dark h-screen w-full bg-[#0F1117] text-[#E2E8F0] flex flex-col font-sans overflow-hidden">
      <form onSubmit={handleSearch} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <nav className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#161B22] shrink-0 z-10 shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white shadow shadow-red-500/20">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">CHANNEL<span className="text-red-500">PRO</span></span>
          </div>
          <div className="flex-1 max-w-2xl px-10">
            <div className="relative flex items-center">
              <Input 
                placeholder="Search channels by keyword (e.g. 'coding tutorials', 'cooking', 'travel')..." 
                className="w-full bg-[#0D1117] border-slate-700 border rounded-md py-1.5 px-4 text-sm focus-visible:ring-1 focus-visible:ring-red-500 placeholder:text-slate-500 h-9 text-white"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
              />
              <Button type="submit" variant="ghost" size="icon" className="absolute right-0 h-9 w-9 text-slate-400 hover:text-white hover:bg-transparent">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!import.meta.env.VITE_YOUTUBE_API_KEY && (
              <Badge variant="outline" className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 py-1 px-3 rounded border border-slate-700 text-slate-300">
                Demo Mode
              </Badge>
            )}
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600"></div>
          </div>
        </nav>

        {/* Workspace Area */}
        <div className="flex flex-1 min-h-0 flex-row overflow-hidden">
          
          {/* Left Sidebar Filters */}
          <aside className="w-64 border-r border-slate-800 bg-[#161B22] p-4 flex flex-col gap-6 overflow-y-auto shrink-0 hidden md:flex">
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-2">
                 <Filter className="w-3 h-3" /> Advanced Filtering
              </h3>
              
              <div className="space-y-4">
                <section>
                  <label className="text-xs text-slate-400 block mb-1.5">Region / Country</label>
                  <Select value={regionCodeInput} onValueChange={setRegionCodeInput}>
                    <SelectTrigger className="w-full bg-[#0D1117] border-slate-700 border rounded text-xs p-1.5 h-8">
                      <SelectValue placeholder="Any Country" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0D1117] border-slate-800 text-slate-200">
                      <SelectItem value="ignore">Any Country</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </section>

                <section>
                  <label className="text-xs text-slate-400 block mb-1.5">Language</label>
                  <Select value={relevanceLanguageInput} onValueChange={setRelevanceLanguageInput}>
                    <SelectTrigger className="w-full bg-[#0D1117] border-slate-700 border rounded text-xs p-1.5 h-8">
                      <SelectValue placeholder="Any Language" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0D1117] border-slate-800 text-slate-200">
                      <SelectItem value="ignore">Any Language</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </section>
                
                <section>
                  <label className="text-xs text-slate-400 block mb-1.5">Subscriber Range</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      placeholder="Min" 
                      value={minSubsInput}
                      onChange={e => setMinSubsInput(e.target.value)}
                      className="w-1/2 bg-[#0D1117] border-slate-700 border rounded text-xs p-1.5 h-8 text-white focus-visible:ring-1 focus-visible:ring-red-500" 
                    />
                    <Input 
                      type="number" 
                      placeholder="Max" 
                      value={maxSubsInput}
                      onChange={e => setMaxSubsInput(e.target.value)}
                      className="w-1/2 bg-[#0D1117] border-slate-700 border rounded text-xs p-1.5 h-8 text-white focus-visible:ring-1 focus-visible:ring-red-500" 
                    />
                  </div>
                </section>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="mt-auto w-full bg-red-600 hover:bg-red-500 border-0 py-2 rounded text-xs font-bold text-white h-9 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              {loading && channels.length === 0 ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply All Filters'}
            </Button>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#0A0D14]">
            
            {/* Sorting Bar */}
            <div className="h-12 border-b border-slate-800 px-6 flex items-center justify-between text-xs shrink-0 bg-[#0C1017]">
              <div className="flex items-center gap-4 text-xs font-medium">
                {appliedFilters.query ? (
                  <span className="text-slate-300">Results for <span className="text-white font-bold">"{appliedFilters.query}"</span></span>
                ) : (
                  <span className="text-slate-400">Overview</span>
                )}
                {error && <span className="border-l pl-4 border-slate-700 text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</span>}
                <span className="border-l border-slate-700 pl-4 text-slate-500">{totalResults > 0 ? `${totalResults}+ API results` : 'Search for channels'}</span>
                <span className="border-l border-slate-700 pl-4 text-slate-500 flex items-center gap-1">
                  <Info className="w-3 h-3" /> API filtered the search deep internally
                </span>
              </div>
              <div className="flex items-center gap-4 hidden sm:flex">
                <span className="text-slate-500 uppercase font-semibold text-[10px]">Sort By:</span>
                <div className="flex border border-slate-700 rounded overflow-hidden">
                  <button type="button" onClick={() => handleSortChange('subscriberCount')} className={`px-3 py-1 border-r border-slate-700 ${appliedFilters.order === 'subscriberCount' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>Subscriber</button>
                  <button type="button" onClick={() => handleSortChange('date')} className={`px-3 py-1 border-r border-slate-700 ${appliedFilters.order === 'date' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>Upload Date</button>
                  <button type="button" onClick={() => handleSortChange('relevance')} className={`px-3 py-1 ${appliedFilters.order === 'relevance' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>Relevance</button>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0">
              <div className="w-full border border-slate-800 rounded-lg flex flex-col bg-[#0D1117] shrink-0">
                 <div className="flex bg-[#161B22] border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest font-semibold p-4 gap-4 rounded-t-lg">
                    <div className="w-16 hidden md:block shrink-0">Rank</div>
                    <div className="flex-1 min-w-[150px]">Channel Info</div>
                    <div className="w-24 hidden sm:block text-center shrink-0">Region</div>
                    <div className="w-24 text-right shrink-0">Subscribers</div>
                    <div className="w-24 hidden md:block text-right shrink-0">Uploads</div>
                    <div className="w-24 text-right hidden sm:block shrink-0">Joined</div>
                 </div>
                 
                 {loading && channels.length === 0 ? (
                    Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="flex border-b border-slate-800 hover:bg-slate-900/50 p-4 gap-4 items-center min-h-[72px]">
                         <div className="w-16 text-slate-500 font-mono text-sm hidden md:block shrink-0"><Skeleton className="h-4 w-8 bg-slate-800" /></div>
                         <div className="flex-1 min-w-[150px] flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded bg-slate-800 shrink-0" />
                            <div className="flex flex-col gap-1 w-full max-w-[200px]">
                               <Skeleton className="h-4 w-full bg-slate-800" />
                               <Skeleton className="h-3 w-2/3 bg-slate-800" />
                            </div>
                         </div>
                         <div className="w-24 hidden sm:block shrink-0"><Skeleton className="h-4 w-12 mx-auto bg-slate-800" /></div>
                         <div className="w-24 shrink-0"><Skeleton className="h-4 w-16 ml-auto bg-slate-800" /></div>
                         <div className="w-24 hidden md:block text-right shrink-0"><Skeleton className="h-4 w-8 ml-auto bg-slate-800" /></div>
                         <div className="w-24 hidden sm:block text-right shrink-0"><Skeleton className="h-4 w-16 ml-auto bg-slate-800" /></div>
                      </div>
                    ))
                 ) : sortedAndFilteredChannels.length > 0 ? (
                    sortedAndFilteredChannels.map((channel, i) => (
                      <Card key={`${channel.id}-${i}`} className={`flex flex-row border-0 border-b border-slate-800 rounded-none bg-transparent hover:bg-slate-900/50 cursor-pointer shadow-none p-4 gap-4 items-center text-sm group min-h-[72px] ${i === sortedAndFilteredChannels.length - 1 ? 'border-b-0 rounded-b-lg' : ''}`}>
                        <div className="w-16 font-mono text-slate-500 shrink-0 hidden md:block">#{String(i + 1).padStart(3, '0')}</div>
                        <div className="flex-1 min-w-[150px] flex items-center gap-3 overflow-hidden">
                          <Avatar className="w-8 h-8 rounded bg-slate-700 shrink-0">
                            <AvatarImage src={channel.thumbnailUrl} alt={channel.title} />
                            <AvatarFallback className="bg-slate-700 text-slate-300 rounded text-xs">{channel.title.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 overflow-hidden pr-4">
                            <CardTitle className="font-bold text-sm text-slate-200 group-hover:text-red-400 truncate flex items-center gap-2">
                              <a href={`https://youtube.com/channel/${channel.id}`} target="_blank" rel="noreferrer" className="truncate">{channel.title}</a>
                              {channel.extractedEmail && (
                                <a href={`mailto:${channel.extractedEmail}`} className="text-slate-400 hover:text-white shrink-0" title={`Email: ${channel.extractedEmail}`} onClick={(e) => e.stopPropagation()}>
                                  <Mail className="w-3 h-3" />
                                </a>
                              )}
                            </CardTitle>
                            <CardDescription className="text-[10px] text-slate-500 uppercase truncate" title={channel.description}>
                              {channel.customUrl || channel.description || 'No description'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="w-24 shrink-0 items-center justify-center hidden sm:flex">
                          {channel.country ? (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${channel.country !== 'Unknown' ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                              {channel.country}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase">
                              Unknown
                            </span>
                          )}
                        </div>
                        <div className="w-24 shrink-0 font-mono text-slate-200 text-right">
                          {channel.subscriberCount ? new Intl.NumberFormat('en-US', { notation: 'compact' }).format(channel.subscriberCount).toUpperCase() : '-'}
                        </div>
                        <div className="w-24 hidden md:flex shrink-0 font-mono text-slate-400 text-right justify-end">
                           {channel.videoCount ? new Intl.NumberFormat('en-US', { notation: 'compact' }).format(channel.videoCount).toUpperCase() : '-'}
                        </div>
                        <div className="w-24 hidden sm:block shrink-0 text-right text-slate-400 text-xs">
                          {new Date(channel.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                        </div>
                      </Card>
                    ))
                 ) : !hasSearched ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500 h-64">
                       <Search className="w-8 h-8 mx-auto text-slate-700 mb-4" />
                       <p className="text-sm font-bold text-slate-400 mb-1">Ready to search</p>
                       <p className="text-xs text-center max-w-sm">Enter your search criteria and click the search icon or "Apply All Filters" to find channels.</p>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500 h-64">
                       <Youtube className="w-8 h-8 mx-auto text-slate-700 mb-4" />
                       <p className="text-sm font-bold text-slate-400 mb-1">No channels found matching the filters</p>
                       <p className="text-xs text-center max-w-sm">The tool scanned through multiple pages but found no channels matching your specific filters. Try loosening your subscriber range or search terms.</p>
                    </div>
                 )}
              </div>
              
              {nextPageToken && (
                <div className="py-8 flex justify-center shrink-0">
                  <Button 
                     type="button" 
                     variant="outline" 
                     onClick={() => fetchResults(true)} 
                     disabled={loading}
                     className="border-slate-700 bg-[#161B22] text-slate-300 hover:bg-slate-800 hover:text-white px-8"
                  >
                     {loading && channels.length > 0 ? (
                       <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</span>
                     ) : (
                       'Load More Channels'
                     )}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Footer Status Bar */}
            <footer className="h-10 border-t border-slate-800 bg-[#161B22] px-6 flex items-center justify-between shrink-0">
              <div className="flex gap-4">
                 <span className="text-[10px] text-slate-500 uppercase flex gap-1 items-center">System Status: <span className="text-green-500 font-bold">Online</span></span>
                 <span className="text-[10px] text-slate-500 uppercase flex gap-1 items-center">Loaded: <span className="text-slate-300">{channels.length} Channels</span></span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="text-[10px] text-white bg-slate-800 px-2 py-0.5 rounded font-mono border border-slate-700">Page {currentPage}</div>
              </div>
            </footer>
          </main>
        </div>
      </form>
      
      {quotaExceeded && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Card className="max-w-md w-full bg-[#1e232b] border border-slate-700 shadow-2xl p-6">
               <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-amber-500">
                     <AlertCircle className="w-6 h-6" />
                     <h2 className="text-lg font-bold text-slate-200">API Quota Exceeded</h2>
                  </div>
                  <p className="text-sm text-slate-400">
                     You have reached the YouTube API daily quota limit. We are currently showing <strong>mock data</strong> so you can continue using the tool to explore formatting and filters.
                  </p>
                  <p className="text-xs text-slate-500">
                     This limit resets at midnight Pacific Time (PT). Try again tomorrow.
                  </p>
                  <div className="flex justify-end mt-4">
                     <Button 
                        onClick={() => setQuotaExceeded(false)}
                        className="bg-slate-700 hover:bg-slate-600 text-white"
                     >
                        Understand
                     </Button>
                  </div>
               </div>
            </Card>
         </div>
      )}
    </div>
  );
}
