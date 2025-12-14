'use client';

import { useLocalStorage } from '@/hooks/use-local-storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Plus } from '@/components/ui/icons'

export default function SparkApp() {
  const [count, setCount] = useLocalStorage<number>('counter', 0)

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-[32px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Spark App
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Your application is running smoothly
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">System Status</CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1.5">
                <CheckCircle weight="fill" className="text-emerald-600 dark:text-emerald-400 w-4 h-4" />
                <span>Active</span>
              </Badge>
            </div>
            <CardDescription>All systems operational</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Counter Value</span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{count ?? 0}</span>
            </div>
            <Button 
              onClick={() => setCount((prev) => (prev ?? 0) + 1)} 
              className="w-full transition-transform active:scale-[0.98]"
            >
              <Plus className="mr-2 w-4 h-4" />
              Increment Counter
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Counter persists across page refreshes
        </p>
      </div>
    </div>
  )
}


import { useLocalStorage } from '@/hooks/use-local-storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Plus } from '@/components/ui/icons'

export default function SparkApp() {
  const [count, setCount] = useLocalStorage<number>('counter', 0)

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-[32px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Spark App
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Your application is running smoothly
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">System Status</CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1.5">
                <CheckCircle weight="fill" className="text-emerald-600 dark:text-emerald-400 w-4 h-4" />
                <span>Active</span>
              </Badge>
            </div>
            <CardDescription>All systems operational</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Counter Value</span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{count ?? 0}</span>
            </div>
            <Button 
              onClick={() => setCount((prev) => (prev ?? 0) + 1)} 
              className="w-full transition-transform active:scale-[0.98]"
            >
              <Plus className="mr-2 w-4 h-4" />
              Increment Counter
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Counter persists across page refreshes
        </p>
      </div>
    </div>
  )
}

