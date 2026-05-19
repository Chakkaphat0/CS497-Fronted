import { useState, useEffect } from 'react'
import { App } from 'antd'
import { auth } from '../firebase'
import { updateProfile } from 'firebase/auth'

export default function ProfilePage({ onBack, onLogout }) {
  const { notification, message: messageApi } = App.useApp()
  const [user, setUser] = useState(auth.currentUser)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u)
      if (u) {
        setDisplayName(u.displayName || '')
        setPhotoURL(u.photoURL || '')
      }
    })
    return () => unsubscribe()
  }, [])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let newPhotoURL = photoURL
      
      // If a new file was selected, upload to Storage
      if (file) {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          const canvas = document.createElement('canvas')
          const img = new Image()
          img.onload = () => {
            const MAX = 256
            let w = img.width, h = img.height
            if (w > h) { h = (h / w) * MAX; w = MAX } else { w = (w / h) * MAX; h = MAX }
            canvas.width = w; canvas.height = h
            canvas.getContext('2d').drawImage(img, 0, 0, w, h)
            resolve(canvas.toDataURL('image/jpeg', 0.8))
          }
          img.onerror = reject
          img.src = URL.createObjectURL(file)
        })

        const { ref, uploadString, getDownloadURL } = await import('firebase/storage')
        const { storage } = await import('../firebase')
        const storageRef = ref(storage, `profiles/${user.uid}.jpg`)
        await uploadString(storageRef, base64Data, 'data_url')
        newPhotoURL = await getDownloadURL(storageRef)
      }

      await updateProfile(user, {
        displayName: displayName,
        photoURL: newPhotoURL
      })
      
      setPhotoURL(newPhotoURL)
      notification.success({
        message: 'อัปเดตโปรไฟล์สำเร็จ',
        description: 'ข้อมูลส่วนตัวของคุณถูกบันทึกเรียบร้อยแล้ว',
        placement: 'topRight',
      })
    } catch (error) {
      notification.error({
        message: 'เกิดข้อผิดพลาด',
        description: error.message,
        placement: 'topRight',
      })
    }
    setLoading(false)
  }

  const handleLogout = () => {
    auth.signOut()
    onLogout()
  }

  if (!user) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <button onClick={onBack} className="text-gray-600 dark:text-gray-300 hover:text-primary-600 flex items-center gap-2">
          &larr; Back
        </button>
        <button onClick={handleLogout} className="text-red-500 hover:text-red-600 font-medium">
          Logout
        </button>
      </div>

      <div className="glass-panel w-full max-w-md p-8 rounded-[2rem] bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Your Profile</h2>

        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-4 border-4 border-primary-100 dark:border-primary-900">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              placeholder="Your Name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-gray-800 dark:file:text-primary-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
