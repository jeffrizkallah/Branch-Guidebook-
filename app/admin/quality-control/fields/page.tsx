'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Settings2,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Star,
  Eye,
  Scale,
  Thermometer,
  Type,
  Hash,
  CheckSquare,
  List,
  FileText,
  ArrowLeft,
  Save,
  X,
  AlertTriangle,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface FieldConfig {
  id: number
  fieldKey: string
  label: string
  fieldType: 'rating' | 'number' | 'text' | 'textarea' | 'checkbox' | 'select'
  isRequired: boolean
  isActive: boolean
  sortOrder: number
  options: { options: string[] } | null
  minValue: number | null
  maxValue: number | null
  placeholder: string | null
  notesEnabled: boolean
  section: 'core' | 'custom'
  icon: string | null
}

const fieldTypeIcons: Record<string, any> = {
  rating: Star,
  number: Hash,
  text: Type,
  textarea: FileText,
  checkbox: CheckSquare,
  select: List
}

const fieldTypeLabels: Record<string, string> = {
  rating: 'Star Rating',
  number: 'Number Input',
  text: 'Text Input',
  textarea: 'Text Area',
  checkbox: 'Checkbox',
  select: 'Dropdown Select'
}

export default function QualityFieldsPage() {
  const [fields, setFields] = useState<FieldConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingField, setEditingField] = useState<FieldConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<FieldConfig | null>(null)

  // Form state for add/edit
  const [formData, setFormData] = useState({
    fieldKey: '',
    label: '',
    fieldType: 'rating' as FieldConfig['fieldType'],
    isRequired: false,
    isActive: true,
    minValue: 1,
    maxValue: 5,
    placeholder: '',
    notesEnabled: false,
    options: [] as string[]
  })

  useEffect(() => {
    fetchFields()
  }, [])

  const fetchFields = async () => {
    try {
      const res = await fetch('/api/quality-checks/fields?activeOnly=false')
      if (res.ok) {
        const data = await res.json()
        setFields(data)
      }
    } catch (error) {
      console.error('Error fetching fields:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fieldKey: '',
      label: '',
      fieldType: 'rating',
      isRequired: false,
      isActive: true,
      minValue: 1,
      maxValue: 5,
      placeholder: '',
      notesEnabled: false,
      options: []
    })
  }

  const openAddModal = () => {
    resetForm()
    setEditingField(null)
    setShowAddModal(true)
  }

  const openEditModal = (field: FieldConfig) => {
    setFormData({
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      isActive: field.isActive,
      minValue: field.minValue ?? 1,
      maxValue: field.maxValue ?? 5,
      placeholder: field.placeholder ?? '',
      notesEnabled: field.notesEnabled,
      options: field.options?.options ?? []
    })
    setEditingField(field)
    setShowAddModal(true)
  }

  const handleSaveField = async () => {
    setSaving(true)
    try {
      const payload = {
        ...formData,
        options: formData.options.length > 0 ? { options: formData.options } : null
      }

      if (editingField) {
        // Update existing
        const res = await fetch(`/api/quality-checks/fields/${editingField.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update field')
        }
      } else {
        // Create new
        const res = await fetch('/api/quality-checks/fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create field')
        }
      }

      setShowAddModal(false)
      fetchFields()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save field')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (field: FieldConfig) => {
    try {
      const res = await fetch(`/api/quality-checks/fields/${field.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !field.isActive })
      })
      if (res.ok) {
        fetchFields()
      }
    } catch (error) {
      console.error('Error toggling field:', error)
    }
  }

  const handleDelete = async (field: FieldConfig) => {
    try {
      const res = await fetch(`/api/quality-checks/fields/${field.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setDeleteConfirm(null)
        fetchFields()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete field')
      }
    } catch (error) {
      console.error('Error deleting field:', error)
    }
  }

  const handleMoveField = async (field: FieldConfig, direction: 'up' | 'down') => {
    const currentIndex = fields.findIndex(f => f.id === field.id)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex < 0 || newIndex >= fields.length) return

    const newFields = [...fields]
    const [removed] = newFields.splice(currentIndex, 1)
    newFields.splice(newIndex, 0, removed)

    // Update sort orders
    const updatedFields = newFields.map((f, index) => ({
      id: f.id,
      sortOrder: index + 1
    }))

    try {
      await fetch('/api/quality-checks/fields/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: updatedFields })
      })
      fetchFields()
    } catch (error) {
      console.error('Error reordering fields:', error)
    }
  }

  const generateFieldKey = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading field configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/quality-control" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="p-2 rounded-xl bg-purple-100">
            <Settings2 className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Form Fields</h1>
            <p className="text-sm text-muted-foreground">Configure quality check form fields</p>
          </div>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Core fields</strong> (Taste, Appearance, Portion, Temperature) cannot be deleted but can be disabled.
          <strong> Custom fields</strong> you add can be fully edited or deleted.
        </p>
      </div>

      {/* Fields List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Active Form Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fields.map((field, index) => {
            const Icon = fieldTypeIcons[field.fieldType] || Type
            return (
              <div
                key={field.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  field.isActive ? "bg-white" : "bg-gray-50 opacity-60"
                )}
              >
                {/* Drag Handle & Order Controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveField(field, 'up')}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMoveField(field, 'down')}
                    disabled={index === fields.length - 1}
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Field Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{field.label}</span>
                    {field.isRequired && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                    {field.section === 'core' && (
                      <Badge variant="secondary" className="text-xs">Core</Badge>
                    )}
                    {!field.isActive && (
                      <Badge variant="outline" className="text-xs">Disabled</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {fieldTypeLabels[field.fieldType]}
                    {field.fieldType === 'rating' && ` (${field.minValue}-${field.maxValue})`}
                    {field.fieldType === 'number' && field.placeholder && ` • ${field.placeholder}`}
                    {field.notesEnabled && ' • Notes enabled'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(field)}
                    className={field.isActive ? "text-green-600" : "text-gray-400"}
                  >
                    {field.isActive ? 'Enabled' : 'Disabled'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(field)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {field.section === 'custom' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(field)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No fields configured. Click &quot;Add Field&quot; to create one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                {editingField ? 'Edit Field' : 'Add New Field'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {/* Label */}
              <div>
                <label className="text-sm font-medium mb-1 block">Field Label *</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      label: e.target.value,
                      fieldKey: editingField ? formData.fieldKey : generateFieldKey(e.target.value)
                    })
                  }}
                  placeholder="e.g., Texture Score"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Field Key */}
              <div>
                <label className="text-sm font-medium mb-1 block">Field Key *</label>
                <input
                  type="text"
                  value={formData.fieldKey}
                  onChange={(e) => setFormData({ ...formData, fieldKey: e.target.value })}
                  placeholder="texture_score"
                  disabled={!!editingField}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary disabled:bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lowercase letters, numbers, and underscores only. Cannot be changed after creation.
                </p>
              </div>

              {/* Field Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">Field Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(fieldTypeLabels).map(([type, label]) => {
                    const Icon = fieldTypeIcons[type]
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={!!editingField}
                        onClick={() => setFormData({ ...formData, fieldType: type as any })}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors",
                          formData.fieldType === type
                            ? "border-primary bg-primary/10"
                            : "border-gray-200 hover:border-gray-300",
                          editingField && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Rating/Number specific options */}
              {(formData.fieldType === 'rating' || formData.fieldType === 'number') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Min Value</label>
                    <input
                      type="number"
                      value={formData.minValue}
                      onChange={(e) => setFormData({ ...formData, minValue: parseFloat(e.target.value) })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Value</label>
                    <input
                      type="number"
                      value={formData.maxValue}
                      onChange={(e) => setFormData({ ...formData, maxValue: parseFloat(e.target.value) })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Placeholder */}
              {(formData.fieldType === 'text' || formData.fieldType === 'textarea' || formData.fieldType === 'number') && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Placeholder Text</label>
                  <input
                    type="text"
                    value={formData.placeholder}
                    onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                    placeholder="e.g., Enter value..."
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              )}

              {/* Select Options */}
              {formData.fieldType === 'select' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Options (one per line)</label>
                  <textarea
                    value={formData.options.join('\n')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      options: e.target.value.split('\n').filter(o => o.trim()) 
                    })}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    className="w-full p-2 border rounded-lg min-h-[100px]"
                  />
                </div>
              )}

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Required field</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Active (show in form)</span>
                </label>
                {formData.fieldType !== 'checkbox' && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notesEnabled}
                      onChange={(e) => setFormData({ ...formData, notesEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Include notes field</span>
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveField}
                  disabled={!formData.label || !formData.fieldKey || saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingField ? 'Update Field' : 'Add Field'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="font-semibold text-lg">Delete Field</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete &quot;{deleteConfirm.label}&quot;? 
              This action cannot be undone. Existing data for this field will be preserved but no longer visible.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


