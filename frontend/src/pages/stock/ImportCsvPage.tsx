import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Upload, Download, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { stockService, type ImportCsvResult } from '@/services/stockService'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function ImportCsvPage() {
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportCsvResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setFileName(file.name)
    setResult(null)
    setProgress(0)
    setLoading(true)

    try {
      const res = await stockService.importCsv(file, setProgress)
      setResult(res)
      if (res.erreurs.length === 0) {
        toast.success(`Import réussi : ${res.créés} créés, ${res.misÀJour} mis à jour`)
      } else {
        toast.error(`${res.erreurs.length} erreur(s) détectée(s) — aucun import effectué`)
      }
    } catch (e: any) {
      const data = e.response?.data
      if (data?.erreurs) {
        setResult(data)
        toast.error(`${data.erreurs.length} erreur(s) de validation`)
      } else {
        toast.error('Erreur lors de l\'import')
      }
    } finally {
      setLoading(false)
      setProgress(100)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: loading,
  })

  const handleDownloadTemplate = async () => {
    const blob = await stockService.downloadTemplateCsv()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'articles-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import articles CSV"
        subtitle="Importez ou mettez à jour votre catalogue pièces via un fichier CSV"
        actions={
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger le template
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Déposer le fichier CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            {isDragActive ? (
              <p className="text-primary font-medium">Déposez le fichier ici...</p>
            ) : (
              <>
                <p className="font-medium">Glissez-déposez votre fichier CSV ou cliquez pour sélectionner</p>
                <p className="text-sm text-muted-foreground mt-1">Taille max : 5 MB — Format .csv uniquement</p>
              </>
            )}
            {fileName && !loading && (
              <p className="mt-3 text-sm flex items-center justify-center gap-1">
                <FileText className="h-4 w-4" /> {fileName}
              </p>
            )}
          </div>

          {loading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Upload en cours…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{result.total}</p>
              <p className="text-sm text-muted-foreground">Lignes traitées</p>
            </CardContent>
          </Card>
          <Card className={result.erreurs.length === 0 ? 'border-green-500/50' : ''}>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-green-600">{result.créés}</p>
              <p className="text-sm text-muted-foreground">Articles créés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-blue-600">{result.misÀJour}</p>
              <p className="text-sm text-muted-foreground">Articles mis à jour</p>
            </CardContent>
          </Card>
        </div>
      )}

      {result && result.erreurs.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              {result.erreurs.length} erreur(s) — aucun enregistrement importé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Ligne</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.erreurs.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="destructive">{e.ligne}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{e.référence || '—'}</TableCell>
                    <TableCell className="text-sm">{e.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {result && result.erreurs.length === 0 && result.total > 0 && (
        <Card className="border-green-500/50">
          <CardContent className="pt-6 flex items-center gap-3 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span>Import terminé avec succès en {(result.duréeMs / 1000).toFixed(2)}s</span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
