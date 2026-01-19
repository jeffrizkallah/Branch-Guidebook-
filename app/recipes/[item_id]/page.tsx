'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown, 
  ChevronRight, 
  ArrowLeft, 
  Loader2, 
  ChefHat, 
  Package,
  DollarSign,
  BookOpen,
  Plus,
  AlertCircle
} from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Ingredient {
  ingredient_name: string
  item_type: 'ingredient' | 'subrecipe'
  quantity: number
  unit: string
  unit_cost: number
  ingredient_total_cost: number
  notes: string | null
  barcode: string | null
  subrecipe_item_id?: number
  subrecipe_ingredients?: Ingredient[]
}

interface RecipeDetail {
  item_id: number
  item: string
  category: string
  product_group: string
  recipe_total_cost: number
  ingredients: Ingredient[]
  linked_instructions?: {
    recipe_id: string
    name: string
  } | null
}

interface IngredientRowProps {
  ingredient: Ingredient
  depth?: number
}

function IngredientRow({ ingredient, depth = 0 }: IngredientRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isSubrecipe = ingredient.item_type === 'subrecipe'
  const hasSubIngredients = isSubrecipe && ingredient.subrecipe_ingredients && ingredient.subrecipe_ingredients.length > 0
  
  const paddingLeft = depth * 24

  return (
    <>
      <div 
        className={`
          flex items-center py-3 px-4 border-b last:border-b-0
          ${isSubrecipe ? 'bg-primary/5 cursor-pointer hover:bg-primary/10' : 'hover:bg-muted/50'}
          ${depth > 0 ? 'border-l-2 border-l-primary/30' : ''}
          transition-colors
        `}
        style={{ paddingLeft: paddingLeft + 16 }}
        onClick={() => hasSubIngredients && setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Icon or Type Icon */}
        <div className="w-6 flex-shrink-0">
          {hasSubIngredients ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-primary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-primary" />
            )
          ) : isSubrecipe ? (
            <ChefHat className="h-4 w-4 text-primary" />
          ) : (
            <Package className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Ingredient Name */}
        <div className="flex-1 min-w-0">
          <span className={`font-medium ${isSubrecipe ? 'text-primary' : ''}`}>
            {ingredient.ingredient_name}
          </span>
          {ingredient.notes && (
            <span className="text-xs text-muted-foreground ml-2">
              ({ingredient.notes})
            </span>
          )}
          {isSubrecipe && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Sub-recipe
            </Badge>
          )}
        </div>

        {/* Quantity & Unit */}
        <div className="w-24 text-right flex-shrink-0">
          <span className="font-mono">
            {ingredient.quantity > 0 ? ingredient.quantity.toLocaleString() : '—'}
          </span>
          <span className="text-muted-foreground ml-1 text-sm">
            {ingredient.unit || ''}
          </span>
        </div>

        {/* Cost */}
        <div className="w-20 text-right flex-shrink-0 text-muted-foreground text-sm hidden md:block">
          {ingredient.ingredient_total_cost > 0 
            ? `${ingredient.ingredient_total_cost.toFixed(2)}` 
            : '—'
          }
        </div>
      </div>

      {/* Nested Subrecipe Ingredients */}
      {isExpanded && hasSubIngredients && (
        <div className="bg-muted/30">
          {ingredient.subrecipe_ingredients!.map((subIngredient, idx) => (
            <IngredientRow 
              key={`${subIngredient.ingredient_name}-${idx}`}
              ingredient={subIngredient}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default function RecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const itemId = params.item_id as string

  // Check if user can create instructions
  const userRole = (session?.user as { role?: string })?.role
  const canCreateInstructions = ['admin', 'operations_lead'].includes(userRole || '')

  useEffect(() => {
    if (itemId) {
      fetchRecipe()
    }
  }, [itemId])

  const fetchRecipe = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/odoo-recipes/${itemId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Recipe not found')
        } else {
          throw new Error('Failed to fetch recipe')
        }
        return
      }
      const data = await res.json()
      setRecipe(data)
    } catch (error) {
      console.error('Error fetching recipe:', error)
      setError('Failed to load recipe')
    } finally {
      setIsLoading(false)
    }
  }

  // Count total ingredients including subrecipes
  const countIngredients = (ingredients: Ingredient[]): { total: number; subrecipes: number } => {
    let total = 0
    let subrecipes = 0
    for (const ing of ingredients) {
      total++
      if (ing.item_type === 'subrecipe') {
        subrecipes++
      }
    }
    return { total, subrecipes }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{error || 'Recipe not found'}</p>
        <Button variant="outline" onClick={() => router.push('/recipes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Recipes
        </Button>
      </div>
    )
  }

  const { total: ingredientCount, subrecipes: subrecipeCount } = countIngredients(recipe.ingredients)

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-start gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/recipes')}
              className="flex-shrink-0 mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-primary line-clamp-2">
                {recipe.item}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {recipe.category && (
                  <Badge variant="secondary">{recipe.category}</Badge>
                )}
                {recipe.product_group && (
                  <Badge variant="outline">{recipe.product_group}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{ingredientCount}</p>
                <p className="text-xs text-muted-foreground">Ingredients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{subrecipeCount}</p>
                <p className="text-xs text-muted-foreground">Sub-recipes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-2">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {recipe.recipe_total_cost > 0 
                    ? recipe.recipe_total_cost.toFixed(2) 
                    : '—'
                  }
                </p>
                <p className="text-xs text-muted-foreground">Total Cost</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Instructions Button */}
        <Card>
          <CardContent className="p-4">
            {recipe.linked_instructions ? (
              <Link href={`/admin/recipe-instructions/${recipe.linked_instructions.recipe_id}`}>
                <Button className="w-full gap-2" size="lg">
                  <BookOpen className="h-5 w-5" />
                  View Instructions
                  <span className="text-xs opacity-75">
                    ({recipe.linked_instructions.name})
                  </span>
                </Button>
              </Link>
            ) : (
              <div className="text-center py-2">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>No instructions available for this recipe</span>
                </div>
                {canCreateInstructions && (
                  <Link href="/admin/recipe-instructions/import">
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Instructions
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ingredients List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ingredients
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tap on sub-recipes to expand their ingredients
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="flex items-center py-2 px-4 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
              <div className="w-6 flex-shrink-0"></div>
              <div className="flex-1">Item</div>
              <div className="w-24 text-right flex-shrink-0">Qty</div>
              <div className="w-20 text-right flex-shrink-0 hidden md:block">Cost</div>
            </div>
            
            {/* Ingredients */}
            {recipe.ingredients.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No ingredients found
              </div>
            ) : (
              recipe.ingredients.map((ingredient, idx) => (
                <IngredientRow 
                  key={`${ingredient.ingredient_name}-${idx}`}
                  ingredient={ingredient}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
