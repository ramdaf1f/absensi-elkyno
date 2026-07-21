export type AttendancePayload = {
  latitude: number
  longitude: number
  accuracy: number
  photoUrl?: string
  deviceTime: string
}

export type AttendanceResponse = {
  success: boolean
  attendanceId?: string
  serverTime?: string
  code?: string
  message?: string
}

async function sendAttendanceRequest(path: string, payload: AttendancePayload): Promise<AttendanceResponse> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    return (await response.json()) as AttendanceResponse
  } catch {
    return {
      success: false,
      code: 'NETWORK_ERROR',
      message: 'Unable to reach server',
    }
  }
}

export async function checkIn(payload: AttendancePayload): Promise<AttendanceResponse> {
  return sendAttendanceRequest('/api/attendance/check-in', payload)
}

export async function checkOut(payload: AttendancePayload): Promise<AttendanceResponse> {
  return sendAttendanceRequest('/api/attendance/check-out', payload)
}
