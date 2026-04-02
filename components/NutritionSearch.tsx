//components/NutritionSearch.tsx
import { useState, useEffect, useCallback } from 'react';
import { NutritionItem, NutritionData } from '@/types';

interface NutritionSearchProps {
  onIngredientsChange: (ingredients: string) => void;
  onNutritionChange: (nutrition: NutritionData | undefined) => void;
  initialIngredients?: string;
}

interface FoodResult {
  id: string;
  name: string;
  brands?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
}

const OZ_TO_GRAMS = 28.3495;

export default function NutritionSearch({
  onIngredientsChange,
  onNutritionChange,
  initialIngredients = '',
}: NutritionSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItems, setSelectedItems] = useState<NutritionItem[]>([]);
  const [manualText, setManualText] = useState(initialIngredients);
  const [searchError, setSearchError] = useState('');
  const [nutritionEnabled, setNutritionEnabled] = useState(false);
  const [servingInputs, setServingInputs] = useState<Record<string, number>>({});

  // Update parent with combined ingredients string
  useEffect(() => {
    const selectedNames = selectedItems.map(item => item.name);
    const manualItems = manualText.trim();
    const allIngredients = [...selectedNames];
    if (manualItems) {
      allIngredients.push(manualItems);
    }
    onIngredientsChange(allIngredients.join(', '));
  }, [selectedItems, manualText, onIngredientsChange]);

  // Update parent with nutrition data
  useEffect(() => {
    if (selectedItems.length === 0) {
      onNutritionChange(undefined);
      return;
    }
    const nutritionData: NutritionData = {
      items: selectedItems,
      totalCalories: Math.round(selectedItems.reduce((sum, item) => sum + item.calculatedCalories, 0)),
      totalProtein: Math.round(selectedItems.reduce((sum, item) => sum + (item.protein * item.servingGrams / 100), 0) * 10) / 10,
      totalCarbs: Math.round(selectedItems.reduce((sum, item) => sum + (item.carbs * item.servingGrams / 100), 0) * 10) / 10,
      totalFat: Math.round(selectedItems.reduce((sum, item) => sum + (item.fat * item.servingGrams / 100), 0) * 10) / 10,
    };
    onNutritionChange(nutritionData);
  }, [selectedItems, onNutritionChange]);

  // Search — direct client-side call (matches working CalorieCalculator pattern)
  const searchFood = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          searchQuery
        )}&search_simple=1&action=process&json=1&page_size=8&fields=id,product_name,brands,nutriments,image_small_url`
      );
      const data = await res.json();

      const foods: FoodResult[] = (data.products ?? [])
        .filter(
          (p: any) =>
            p.product_name && p.nutriments?.['energy-kcal_100g']
        )
        .map((p: any) => ({
          id: p.id ?? `food_${Date.now()}_${Math.random()}`,
          name: p.product_name,
          brands: p.brands || undefined,
          calories: Math.round(p.nutriments['energy-kcal_100g'] ?? 0),
          protein: Math.round(p.nutriments['proteins_100g'] ?? 0),
          carbs: Math.round(p.nutriments['carbohydrates_100g'] ?? 0),
          fat: Math.round(p.nutriments['fat_100g'] ?? 0),
          imageUrl: p.image_small_url || undefined,
        }));

      setSearchResults(foods);

      if (foods.length === 0) {
        setSearchError('No results found. Try a different search term.');
      }
    } catch {
      setSearchError('Search failed. Please check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  function handleAddFood(food: FoodResult) {
    const servingGrams = servingInputs[food.id] ?? 100;

    const item: NutritionItem = {
      name: food.brands ? `${food.name} (${food.brands})` : food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      servingGrams,
      calculatedCalories: Math.round((food.calories * servingGrams) / 100),
      productId: food.id,
      imageUrl: food.imageUrl,
    };

    setSelectedItems(prev => [...prev, item]);
  }

  function handleRemoveItem(index: number) {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  }

  function handleServingChange(index: number, newServingGrams: number) {
    setSelectedItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const clamped = Math.max(1, newServingGrams);
        return {
          ...item,
          servingGrams: clamped,
          calculatedCalories: Math.round((item.calories * clamped) / 100),
        };
      })
    );
  }

  const totalCalories = selectedItems.reduce((sum, item) => sum + item.calculatedCalories, 0);

  return (
    <div className="space-y-3">
      {/* Ingredients text area (always visible) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ingredients <span className="text-red-500">*</span>
        </label>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="Type ingredients here (e.g., Oatmeal, banana, milk...)"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          maxLength={300}
        />
        <p className="mt-1 text-xs text-gray-500">{manualText.length}/300</p>
      </div>

      {/* Toggle nutrition tracking */}
      <button
        type="button"
        onClick={() => setNutritionEnabled(!nutritionEnabled)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
          nutritionEnabled
            ? 'border-green-400 bg-green-50 text-green-800'
            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{nutritionEnabled ? '🔥' : '📊'}</span>
          <span className="text-sm font-medium">
            {nutritionEnabled ? 'Calorie Tracking ON' : 'Add Calorie Info (Optional)'}
          </span>
        </div>
        <div className={`w-10 h-6 rounded-full relative transition-colors ${nutritionEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${nutritionEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
      </button>

      {/* Nutrition search section */}
      {nutritionEnabled && (
        <div className="space-y-3 bg-green-50 border border-green-200 rounded-lg p-4">
          {/* Search input with button */}
          <div>
            <label className="block text-sm font-medium text-green-800 mb-1">
              Search food database
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchFood())}
                placeholder="e.g. banana, cheerios, whole milk..."
                className="flex-1 px-3 py-2 border border-green-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-sm"
              />
              <button
                type="button"
                onClick={searchFood}
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition flex-shrink-0"
              >
                {isSearching ? '⏳' : '🔍 Search'}
              </button>
            </div>
          </div>

          {searchError && (
            <p className="text-xs text-red-600">{searchError}</p>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {searchResults.map((food) => (
                <div
                  key={food.id}
                  className="bg-white rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-start gap-2 mb-2">
                    {food.imageUrl && (
                      <img
                        src={food.imageUrl}
                        alt=""
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {food.name}
                      </p>
                      {food.brands && (
                        <p className="text-xs text-gray-500 truncate">{food.brands}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      🔥 {food.calories} kcal/100g
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      💪 {food.protein}g protein
                    </span>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      🧈 {food.fat}g fat
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      🌾 {food.carbs}g carbs
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={servingInputs[food.id] ?? 100}
                      onChange={(e) =>
                        setServingInputs(prev => ({
                          ...prev,
                          [food.id]: Number(e.target.value),
                        }))
                      }
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <span className="text-xs text-gray-500">grams</span>
                    <span className="text-xs text-gray-400">
                      ({Math.round((servingInputs[food.id] ?? 100) / OZ_TO_GRAMS * 10) / 10}oz)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddFood(food)}
                      className="ml-auto px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-xs font-medium transition"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
              <div className="text-xs text-gray-400 text-center py-1">
                Data from Open Food Facts — values are approximate
              </div>
            </div>
          )}

          {/* Selected nutrition items */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-green-800">Added foods:</div>
              {selectedItems.map((item, index) => (
                <div
                  key={`${item.productId}-${index}`}
                  className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-green-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <label className="text-xs text-gray-500">Serving:</label>
                      <input
                        type="number"
                        value={item.servingGrams}
                        onChange={(e) => handleServingChange(index, parseFloat(e.target.value) || 0)}
                        className="w-16 px-1.5 py-0.5 text-xs border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                        min="1"
                        step="5"
                      />
                      <span className="text-xs text-gray-500">g</span>
                      <span className="text-xs text-gray-400 ml-1">
                        ({Math.round(item.servingGrams / OZ_TO_GRAMS * 10) / 10}oz)
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <div className="text-sm font-bold text-orange-600">{item.calculatedCalories} cal</div>
                    <div className="text-xs text-gray-400">
                      P:{Math.round(item.protein * item.servingGrams / 100)}g
                      C:{Math.round(item.carbs * item.servingGrams / 100)}g
                      F:{Math.round(item.fat * item.servingGrams / 100)}g
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-400 hover:text-red-600 text-lg flex-shrink-0"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Totals bar */}
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5">
                <span className="text-sm font-semibold text-orange-800">🔥 Total Calories</span>
                <span className="text-lg font-bold text-orange-600">{totalCalories} cal</span>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Nutrition data from Open Food Facts. Values are approximate and may vary.
          </p>
        </div>
      )}
    </div>
  );
}
