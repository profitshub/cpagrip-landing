import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

const CpaLandingPage = () => {
  const [offers, setOffers] = useState([]);
  const [filteredOffers, setFilteredOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({
    country: '',
    countryCode: '',
    region: '',
    device: '',
    os: '',
    language: 'en'
  });
  const [error, setError] = useState(null);

  // Function to detect user device and OS
  const detectDevice = () => {
    const userAgent = navigator.userAgent;
    let device = 'desktop';
    let os = 'windows';
    let isMobile = false;
    
    if (/Android/i.test(userAgent)) {
      device = 'android';
      os = 'android';
      isMobile = true;
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      device = iOS => /iPad/.test(userAgent) ? 'tablet' : 'mobile';
      os = 'ios';
      isMobile = true;
    } else if (/Mac/i.test(userAgent)) {
      os = 'mac';
    }
    
    return { device, os, isMobile };
  };

  // Function to get user's location
  const getUserLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region,
        language: data.languages?.split(',')[0] || 'en'
      };
    } catch (err) {
      console.error('Error fetching location:', err);
      return {
        country: 'United States',
        countryCode: 'US',
        region: 'Unknown',
        language: 'en'
      };
    }
  };

  // Function to fetch offers from CPAGrip with dynamic parameters
  const fetchOffers = async (userInfo) => {
    try {
      // Base URL for CPAGrip API
      let baseUrl = 'https://www.cpagrip.com/common/offer_feed_csv.php?user_id=168038&key=ef658333f0c3567f6c493fd816c11f11';
      
      // Generate a unique tracking ID based on user info (optional)
      const trackingId = `${userInfo.countryCode}_${userInfo.device}_${Date.now()}`;
      
      // Add optional parameters based on user info
      const params = new URLSearchParams();
      params.append('tracking_id', trackingId);
      
      // If user is on mobile, request mobile offers
      if (userInfo.isMobile) {
        params.append('showmobile', 'only');
      }
      
      // Optional: Limit the number of offers (adjust as needed)
      params.append('limit', '50');
      
      // Optional: Use a vanity domain (choose one from your list)
      // params.append('domain', 'playabledownload.com');
      
      // Build the final URL
      const finalUrl = `${baseUrl}&${params.toString()}`;
      
      // Fetch the CSV data
      const response = await fetch(finalUrl);
      const csvText = await response.text();
      
      // Parse the CSV
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setOffers(results.data);
            setLoading(false);
          } else {
            setError('No offers found in CSV');
            setLoading(false);
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error}`);
          setLoading(false);
        }
      });
    } catch (err) {
      setError(`Error fetching offers: ${err.message}`);
      setLoading(false);
    }
  };

  // Function to find best offers for user
  const filterOffersByUserInfo = (allOffers, userInfo) => {
    if (!allOffers || allOffers.length === 0) return [];
    
    // First, filter by country if we have country info
    let matchedOffers = allOffers;
    if (userInfo.countryCode) {
      // Check if the offer has a countries field and filter by it
      // Assuming the CSV has a 'countries' field with comma-separated country codes
      matchedOffers = allOffers.filter(offer => {
        // If the offer doesn't specify countries, it's likely worldwide
        if (!offer.countries) return true;
        
        const countries = offer.countries.split(',').map(c => c.trim());
        return countries.includes(userInfo.countryCode) || countries.includes('WW') || countries.includes('ALL');
      });
    }
    
    // Filter by device type if we have device info
    if (userInfo.device) {
      const deviceMatches = matchedOffers.filter(offer => {
        if (!offer.device_targeting) return true; // Assume no targeting means all devices
        
        const deviceTargeting = offer.device_targeting.toLowerCase();
        
        // Check if the offer targets the user's device
        if (userInfo.isMobile) {
          return deviceTargeting.includes('mobile') || deviceTargeting.includes(userInfo.device);
        } else {
          return deviceTargeting.includes('desktop') || deviceTargeting.includes('all');
        }
      });
      
      // If we found device-specific offers, use those
      if (deviceMatches.length > 0) {
        matchedOffers = deviceMatches;
      }
    }
    
    // Sort by payout (highest first)
    // Assuming the CSV has a 'payout' field
    matchedOffers = _.orderBy(matchedOffers, [
      offer => parseFloat(offer.payout || '0')
    ], ['desc']);
    
    // Return the top offers (adjust as needed)
    return matchedOffers.slice(0, 12);
  };

  // Function to get translated text
  const getTranslatedText = (key, fallback) => {
    // Simple translation dictionary - expand this as needed
    const translations = {
      'welcome': {
        'en': 'Welcome',
        'es': '¡Bienvenido',
        'fr': 'Bienvenue',
        'de': 'Willkommen',
        'pt': 'Bem-vindo',
        'it': 'Benvenuto',
        'ru': 'Добро пожаловать',
        'zh': '欢迎',
        'ja': 'ようこそ',
        'ar': 'مرحبا'
      },
      'topOffers': {
        'en': 'Top Offers For You',
        'es': 'Mejores ofertas para ti',
        'fr': 'Meilleures offres pour vous',
        'de': 'Top-Angebote für Sie',
        'pt': 'Melhores ofertas para você',
        'it': 'Migliori offerte per te',
        'ru': 'Лучшие предложения для вас',
        'zh': '为您推荐的优惠',
        'ja': 'あなたへのトップオファー',
        'ar': 'أفضل العروض لك'
      },
      'getOffer': {
        'en': 'Get Offer',
        'es': 'Obtener oferta',
        'fr': 'Obtenir l\'offre',
        'de': 'Angebot erhalten',
        'pt': 'Obter oferta',
        'it': 'Ottieni offerta',
        'ru': 'Получить предложение',
        'zh': '获取优惠',
        'ja': 'オファーを取得',
        'ar': 'احصل على العرض'
      },
      'noOffers': {
        'en': 'No offers available for your region at this time.',
        'es': 'No hay ofertas disponibles para tu región en este momento.',
        'fr': 'Aucune offre disponible pour votre région pour le moment.',
        'de': 'Derzeit sind keine Angebote für Ihre Region verfügbar.',
        'pt': 'Nenhuma oferta disponível para sua região no momento.',
        'it': 'Nessuna offerta disponibile per la tua regione al momento.',
        'ru': 'На данный момент нет предложений для вашего региона.',
        'zh': '目前没有适用于您所在地区的优惠。',
        'ja': '現在、お住まいの地域で利用可能なオファーはありません。',
        'ar': 'لا توجد عروض متاحة لمنطقتك في الوقت الحالي.'
      }
    };
    
    const langCode = userInfo.language?.substring(0, 2) || 'en';
    return (translations[key] && translations[key][langCode]) || fallback;
  };

  useEffect(() => {
    const initPage = async () => {
      // Get device info
      const deviceInfo = detectDevice();
      
      // Get location info
      const locationInfo = await getUserLocation();
      
      // Combine user info
      const combinedUserInfo = {
        ...deviceInfo,
        ...locationInfo
      };
      
      // Set user info state
      setUserInfo(combinedUserInfo);
      
      // Fetch offers with user info
      await fetchOffers(combinedUserInfo);
    };
    
    initPage();
  }, []);

  // Filter offers whenever user info or offers change
  useEffect(() => {
    if (offers.length > 0 && userInfo.countryCode) {
      const bestOffers = filterOffersByUserInfo(offers, userInfo);
      setFilteredOffers(bestOffers);
    }
  }, [offers, userInfo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-xl font-semibold text-gray-700">Loading the best offers for you...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center text-red-600">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">CPAGrip Offers</h1>
          <p className="mt-2">
            {getTranslatedText('welcome', 'Welcome')}, {userInfo.country} visitor!
          </p>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto p-4">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{getTranslatedText('topOffers', 'Top Offers For You')}</h2>
          
          {filteredOffers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOffers.map((offer, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  {offer.image_url && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={offer.image_url || "/api/placeholder/400/200"} 
                        alt={offer.title || "Offer"} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{offer.title || offer.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{offer.description?.substring(0, 120) || 'Complete this offer to earn rewards'}...</p>
                    <div className="flex justify-between items-center">
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                        ${offer.payout || '0.00'}
                      </span>
                      <a 
                        href={offer.tracking_link || offer.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-300"
                      >
                        {getTranslatedText('getOffer', 'Get Offer')}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">{getTranslatedText('noOffers', 'No offers available for your region at this time.')}</p>
            </div>
          )}
        </div>
        
        {/* User information (can be removed in production) */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <p>Device: {userInfo.device}</p>
          <p>OS: {userInfo.os}</p>
          <p>Country: {userInfo.country} ({userInfo.countryCode})</p>
          <p>Region: {userInfo.region}</p>
          <p>Language: {userInfo.language}</p>
          <p>Total Offers: {offers.length}</p>
          <p>Filtered Offers: {filteredOffers.length}</p>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 mt-8">
        <div className="container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} CPAGrip Network</p>
        </div>
      </footer>
    </div>
  );
};

export default CpaLandingPage;