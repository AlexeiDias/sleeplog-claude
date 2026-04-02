//app/api/food-search/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ products: [] });
  }

  const url = `https://world.openfoodfacts.net/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,brands,nutriments,image_small_url,serving_quantity`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LogginCare - Web - Version 1.0 - https://loggincare.com',
      },
      next: { revalidate: 300 }, // Cache results for 5 minutes
    });

    if (!response.ok) {
      console.error('[food-search] API status:', response.status);
      return NextResponse.json({ products: [] });
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[food-search] Error:', error.message);
    return NextResponse.json({ products: [] });
  }
}
