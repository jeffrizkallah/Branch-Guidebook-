'use client'

import type { ProductionItem, ProductionStation } from '@/lib/data'
import { getActiveStations } from '@/lib/data'

interface PrintableStationListProps {
  byStation: Record<string, ProductionItem[]>
  date: string
  dayName?: string
}

export function PrintableStationList({
  byStation,
  date,
  dayName
}: PrintableStationListProps) {
  const dateStr = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="hidden print:block">
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      {getActiveStations().map((station, idx) => {
        const items = byStation[station] || []
        if (items.length === 0) return null

        return (
          <div key={station} className={idx > 0 ? 'page-break' : ''}>
            {/* Header */}
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold">{station}</h1>
              <p className="text-lg">{dayName || dateStr}</p>
              <p className="text-sm text-gray-600">{items.length} items</p>
            </div>

            {/* Task List */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 w-8"></th>
                  <th className="text-left py-2">Recipe</th>
                  <th className="text-left py-2 w-32">Target Qty</th>
                  <th className="text-left py-2 w-32">Actual Qty</th>
                  <th className="text-left py-2 w-20">Time</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, itemIdx) => (
                  <tr key={item.itemId} className="border-b border-gray-300">
                    <td className="py-3">
                      <div className="w-5 h-5 border-2 border-black"></div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium">{item.recipeName}</div>
                      {item.notes && (
                        <div className="text-sm text-gray-600">{item.notes}</div>
                      )}
                    </td>
                    <td className="py-3">{item.quantity} {item.unit}</td>
                    <td className="py-3">
                      <div className="border-b border-black w-24 h-6"></div>
                    </td>
                    <td className="py-3">
                      <div className="border-b border-black w-16 h-6"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Completed by:</p>
                  <div className="border-b border-black h-8 mt-1"></div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time:</p>
                  <div className="border-b border-black h-8 mt-1"></div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
