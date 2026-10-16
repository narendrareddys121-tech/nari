'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { createAuctionSchema } from '@bidrush/shared';
import type { Category } from '@bidrush/shared';
import { AlertCircle, ArrowLeft, CheckCircle2, ImagePlus, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

const conditions = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'FOR_PARTS', label: 'For parts or repair' },
] as const;

const localities = [
  'Indiranagar',
  'Koramangala',
  'Whitefield',
  'Electronic City',
  'Jayanagar',
  'JP Nagar',
  'Malleshwaram',
  'Rajajinagar',
  'Hebbal',
  'Yelahanka',
  'Bannerghatta Road',
  'HSR Layout',
  'BTM Layout',
  'Bellandur',
  'Marathahalli',
  'Sarjapur Road',
  'Silk Board',
  'Basavanagudi',
  'Shivajinagar',
  'MG Road',
  'Brigade Road',
  'Richmond Town',
  'Lavelle Road',
  'Cunningham Road',
  'Other',
] as const;

interface CreatedAuction {
  id: string;
  title: string;
  status: string;
}

const fieldClass =
  'mt-2 border-gray-300 focus-visible:ring-black focus-visible:border-black';

export default function CreateAuctionPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdAuction, setCreatedAuction] = useState<CreatedAuction | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [commissionEstimate, setCommissionEstimate] = useState(0);
  const [sellerStatus, setSellerStatus] = useState('UNVERIFIED');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [startingPriceInr, setStartingPriceInr] = useState(0);

  useEffect(() => {
    let active = true;

    api.get<Category[]>('/categories')
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setCategoryError(error instanceof Error ? error.message : 'Could not load categories.');
        }
      })
      .finally(() => {
        if (active) setLoadingCategories(false);
      });

    api.get<{ status: string }>('/seller/verification')
      .then((data) => {
        if (active) setSellerStatus(data.status);
      })
      .catch(() => {
        if (active) setVerificationMessage('Seller verification status could not be loaded.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const urls = selectedImages.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedImages]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length + selectedImages.length > 8) {
      setFormError('You can upload up to 8 product photos.');
      return;
    }
    const invalid = files.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024);
    if (invalid) {
      setFormError('Choose JPEG, PNG, or WebP photos under 10 MB each.');
      return;
    }
    setFormError('');
    setSelectedImages((current) => [...current, ...files]);
    event.target.value = '';
  }

  function handleStartingPriceChange(event: ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    setStartingPriceInr(Number.isFinite(value) && value > 0 ? value : 0);
    setCommissionEstimate(Number.isFinite(value) && value > 0 ? Math.round(value * 7) : 0);
  }

  async function requestVerification() {
    setVerificationMessage('');
    try {
      const result = await api.post<{ status: string }>('/seller/verification/request', {});
      setSellerStatus(result.status);
      setVerificationMessage('Seller verification requested. You can publish your auction after approval.');
    } catch (error) {
      setVerificationMessage(error instanceof Error ? error.message : 'Could not request seller verification.');
    }
  }

  async function uploadAndPublish(auctionId: string): Promise<CreatedAuction> {
    if (selectedImages.length === 0) {
      throw new Error('Add at least one product photo before publishing.');
    }
    const formData = new FormData();
    selectedImages.forEach((file) => formData.append('images', file));
    await api.upload(`/uploads/auction-images/${auctionId}`, formData);
    return api.post<CreatedAuction>(`/auctions/${auctionId}/publish`, {});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    if (selectedImages.length === 0) {
      setFormError('Add at least one product photo before saving your auction.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const scheduledStartAt = String(formData.get('scheduledStartAt') ?? '');
    const reservePrice = String(formData.get('reservePriceInr') ?? '');
    const result = createAuctionSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description'),
      categoryId: formData.get('categoryId'),
      condition: formData.get('condition'),
      brand: String(formData.get('brand') ?? '').trim() || undefined,
      model: String(formData.get('model') ?? '').trim() || undefined,
      locationLocality: formData.get('locationLocality'),
      pickupAvailable: formData.get('pickupAvailable') === 'on',
      deliveryAvailable: formData.get('deliveryAvailable') === 'on',
      startingPriceInr: Number(formData.get('startingPriceInr')),
      minimumIncrementInr: Number(formData.get('minimumIncrementInr')),
      durationHours: Number(formData.get('durationHours')),
      scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt).toISOString() : undefined,
      reservePriceInr: reservePrice ? Number(reservePrice) : null,
    });

    if (!result.success) {
      setFormError(result.error.issues.map((issue) => issue.message).join(' '));
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ auction: CreatedAuction }>('/auctions', result.data);
      if (selectedImages.length === 0) {
        setCreatedAuction(response.auction);
        return;
      }
      if (sellerStatus !== 'VERIFIED') {
        const formDataForDraft = new FormData();
        selectedImages.forEach((file) => formDataForDraft.append('images', file));
        await api.upload(`/uploads/auction-images/${response.auction.id}`, formDataForDraft);
        setCreatedAuction(response.auction);
        setFormError('');
        setVerificationMessage('Your auction and photos are saved as a draft. Verification approval is required before publishing.');
        return;
      }
      setPublishing(true);
      const publishedAuction = await uploadAndPublish(response.auction.id);
      setCreatedAuction(publishedAuction);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Could not create the auction. Please try again.');
    } finally {
      setPublishing(false);
      setSubmitting(false);
    }
  }

  if (createdAuction) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="border-emerald-200 bg-white">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-600" />
            <h2 className="text-2xl font-bold text-gray-900">Auction draft created</h2>
            <p className="mt-2 max-w-md text-sm text-gray-600">
              {createdAuction.status === 'LIVE'
                ? `${createdAuction.title} is now published and live.`
                : `${createdAuction.title} is saved as a draft. Add photos and complete seller verification before publishing.`}
            </p>
            {verificationMessage && <p className="mt-3 max-w-md text-sm text-amber-800">{verificationMessage}</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auctions">Explore auctions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Seller dashboard</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">Create an auction</h2>
        <p className="mt-2 text-sm text-gray-600">
          Add clear item details and pricing. Your listing will be saved as a draft.
        </p>
      </div>

      <Card className="border-gray-200 bg-white">
        <CardHeader>
          <CardTitle className="text-xl">Item details</CardTitle>
          <CardDescription>Tell bidders what you are selling.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productImages">Product photos (up to 8)</Label>
              <label htmlFor="productImages" className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-gray-500">
                <ImagePlus className="mb-2 h-7 w-7 text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">Choose product photos</span>
                <span className="mt-1 text-xs text-gray-500">JPEG, PNG, or WebP · up to 10 MB each</span>
                <input id="productImages" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageChange} className="sr-only" />
              </label>
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                      <img src={url} alt={`Product photo ${index + 1} preview`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label={`Remove product photo ${index + 1}`}
                        onClick={() => setSelectedImages((images) => images.filter((_, itemIndex) => itemIndex !== index))}
                        className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-gray-700 shadow"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Auction title</Label>
              <Input id="title" name="title" className={fieldClass} minLength={5} maxLength={200} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                className="mt-2 min-h-32 border-gray-300 focus-visible:ring-black"
                minLength={20}
                maxLength={5000}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  className={`flex h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black ${fieldClass}`}
                  defaultValue=""
                  required
                  disabled={loadingCategories || !!categoryError}
                >
                  <option value="" disabled>
                    {loadingCategories ? 'Loading categories…' : 'Choose a category'}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {categoryError && (
                  <p role="alert" className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {categoryError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  name="condition"
                  className={`flex h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black ${fieldClass}`}
                  defaultValue=""
                  required
                >
                  <option value="" disabled>Choose condition</option>
                  {conditions.map((condition) => (
                    <option key={condition.value} value={condition.value}>{condition.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand <span className="font-normal text-gray-500">(optional)</span></Label>
                <Input id="brand" name="brand" className={fieldClass} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model <span className="font-normal text-gray-500">(optional)</span></Label>
                <Input id="model" name="model" className={fieldClass} maxLength={100} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationLocality">Pickup locality in Bengaluru</Label>
              <select
                id="locationLocality"
                name="locationLocality"
                className={`flex h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black ${fieldClass}`}
                defaultValue=""
                required
              >
                <option value="" disabled>Choose a locality</option>
                {localities.map((locality) => (
                  <option key={locality} value={locality}>{locality}</option>
                ))}
              </select>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-gray-900">Fulfilment options</legend>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input type="checkbox" name="pickupAvailable" defaultChecked className="h-4 w-4 accent-black" />
                Buyer pickup available
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input type="checkbox" name="deliveryAvailable" className="h-4 w-4 accent-black" />
                Delivery available
              </label>
            </fieldset>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-gray-900">Auction pricing</h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startingPriceInr">Starting price (₹)</Label>
                  <Input id="startingPriceInr" name="startingPriceInr" className={fieldClass} type="number" min="1" max="10000000" step="1" required onChange={handleStartingPriceChange} />
                  <p className="text-xs text-gray-500">At the starting price, estimated 7% platform commission is {formatPrice(commissionEstimate * 100)} and estimated proceeds are {formatPrice(Math.round(startingPriceInr * 93 * 100))}.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumIncrementInr">Minimum bid increase (₹)</Label>
                  <Input id="minimumIncrementInr" name="minimumIncrementInr" className={fieldClass} type="number" min="1" max="100000" step="1" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationHours">Auction duration</Label>
                  <select
                    id="durationHours"
                    name="durationHours"
                    className={`flex h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black ${fieldClass}`}
                    defaultValue="24"
                  >
                    <option value="6">6 hours</option>
                    <option value="12">12 hours</option>
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledStartAt">Start later <span className="font-normal text-gray-500">(optional)</span></Label>
                  <Input id="scheduledStartAt" name="scheduledStartAt" className={fieldClass} type="datetime-local" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="reservePriceInr">Reserve price (₹) <span className="font-normal text-gray-500">(optional)</span></Label>
                  <Input id="reservePriceInr" name="reservePriceInr" className={fieldClass} type="number" min="0" max="10000000" step="1" />
                  <p className="text-xs text-gray-500">The reserve price is private and is never shown to bidders.</p>
                </div>
              </div>
            </div>

            {formError && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {formError}
              </p>
            )}

            {sellerStatus !== 'VERIFIED' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-950">Seller verification: {sellerStatus.replace('_', ' ')}</p>
                    <p className="mt-1 text-sm text-amber-900">You can save drafts now. Email verification and admin approval are required before a listing can go live.</p>
                    {verificationMessage && <p className="mt-2 text-sm text-amber-950" role="status">{verificationMessage}</p>}
                    {sellerStatus !== 'PENDING' && (
                      <Button type="button" variant="outline" className="mt-3 border-amber-500 bg-white" onClick={requestVerification}>
                        Request seller verification
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <Button asChild type="button" variant="outline">
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button type="submit" disabled={submitting || loadingCategories || !!categoryError || publishing}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Saving auction…' : sellerStatus === 'VERIFIED' ? 'Create and publish auction' : 'Save auction draft'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
