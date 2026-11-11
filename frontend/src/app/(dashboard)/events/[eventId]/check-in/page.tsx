'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { QrScannerView } from '@/components/checkin/QrScannerView';

export default function EventCheckInPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  return <QrScannerView initialEventId={eventId} />;
}
