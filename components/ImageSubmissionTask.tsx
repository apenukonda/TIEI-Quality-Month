import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { Page } from '../types';
import { ChevronLeftIcon, CheckCircleIcon } from './icons';

// A simple spinner component for loading states
const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

const ImageSubmissionTask: React.FC = () => {
    const { setCurrentPage, updateTaskCompletion, getSubmission, submitImageUrl, currentUser, t, language } = useContext(AppContext);
    
    // --- IMPORTANT: CLOUDINARY SETUP ---
    // The image submission task will not work until you configure your Cloudinary account.
    // Please follow the instructions in the `README.md` file to get these values.
    // FIX: Explicitly typing constants as `string` avoids TypeScript inferring them as overly-specific
    // literal types, which resolves the comparison error below while preserving the intended configuration check.
    const CLOUD_NAME: string = 'dwye6tkdy';
    const UPLOAD_PRESET: string = 'toyato_span';
    // --- END OF CLOUDINARY SETUP ---

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [submittedImageUrl, setSubmittedImageUrl] = useState<string | null>(null);

    // Check if the credentials are still placeholders
    const isCloudinaryConfigured = CLOUD_NAME !== 'YOUR_CLOUD_NAME_HERE' && UPLOAD_PRESET !== 'YOUR_UNSIGNED_UPLOAD_PRESET_HERE';

    const fetchSubmission = useCallback(async () => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await getSubmission('task3');
            if (error) {
                console.error(error);
                setError("Could not fetch previous submissions.");
            } else if (data && data.length > 0) {
                setSubmittedImageUrl(data[0].image_url);
            }
        } catch (err) {
            console.error('Error in fetchSubmission:', err);
            setError("Failed to load submission data.");
        } finally {
            setLoading(false);
        }
    }, [currentUser, getSubmission]);

    useEffect(() => {
        fetchSubmission();
    }, [fetchSubmission]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) {
            setFile(null);
            setPreview(null);
            return;
        }

        // Validation
        if (!selectedFile.type.startsWith('image/')) {
            setError('Please upload an image file.');
            return;
        }
        if (selectedFile.size > 500 * 1024) { // 500 KB
            setError('Image size must be below 500kb.');
            return;
        }

        setFile(selectedFile);
        if (preview) {
            URL.revokeObjectURL(preview);
        }
        setPreview(URL.createObjectURL(selectedFile));
    };

    const handleSubmit = async () => {
        if (!isCloudinaryConfigured) {
            setError('Image upload is not configured. Please follow the setup instructions in README.md.');
            return;
        }

        if (!file) {
            setError('Please select an image to upload.');
            return;
        }
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
                // Add timeout to prevent hanging
                signal: AbortSignal.timeout(30000), // 30 second timeout
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.error?.message || 'Please check your Cloudinary settings (Cloud Name and Upload Preset).';
                throw new Error(`Image upload failed: ${errorMessage}`);
            }

            const data = await response.json();
            const imageUrl = data.secure_url;

            // Save URL to Supabase
            const { success, error: dbError } = await submitImageUrl('task3', imageUrl);
            if (!success) {
                throw dbError || new Error('Failed to save submission to database.');
            }
            
            // Update task progress and award 5 points
            await updateTaskCompletion('task3', 1, 5);
            setSubmittedImageUrl(imageUrl);

        } catch (err: any) {
            if (err.name === 'TimeoutError') {
                setError('Upload timed out. Please check your internet connection and try again.');
            } else {
                setError(err.message || 'An unexpected error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && !submittedImageUrl) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 animate-fade-in">
          <Spinner />
          <p className="mt-4 text-black">{t('loading')}</p>
        </div>
      );
    }

    if (submittedImageUrl) {
        return (
             <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 text-center animate-fade-in">
                <button
                    data-kn-skip
                    onClick={() => setCurrentPage(Page.DASHBOARD)}
                        className="absolute top-20 left-4 sm:left-6 lg:left-8 flex items-center gap-2 text-black hover:text-red-500 transition-colors"
                >
                    <ChevronLeftIcon className="w-6 h-6"/>
                    {t('back')}
                </button>
                
                <div className="w-full max-w-2xl">
                    <h1 className="text-4xl font-bold mb-4">{t('submission_received')}</h1>
                    <div className="bg-white p-8 rounded-2xl shadow-xl">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-lg text-black mb-6">{t('thank_you_submission')} {language === 'kn' ? '5 ಅಂಕಗಳನ್ನು' : '5 points'} {language === 'kn' ? 'ಮತ್ತು ಈ ಟಾಸ್ಕ್ ಅನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಮುಗಿಸಿದ್ದೀರಿ.' : 'and successfully completed this task.'}</p>
                        <div className="w-full flex justify-center">
                            {/* Limit the image max-height so tall images don't overflow mobile viewports */}
                            <img
                                src={submittedImageUrl}
                                alt="Submitted cartoon"
                                className="w-full h-auto max-w-full sm:max-w-md mx-auto rounded-lg shadow-lg object-contain max-h-[60vh]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 animate-fade-in">
            <button
                data-kn-skip
                onClick={() => setCurrentPage(Page.DASHBOARD)}
                className="absolute top-20 left-4 sm:left-6 lg:left-8 flex items-center gap-2 text-black hover:text-red-500 transition-colors"
            >
                <ChevronLeftIcon className="w-6 h-6"/>
                {t('back')}
            </button>
                      <div className="w-full max-w-2xl">
                          {/* Add small top margin on mobile so title doesn't overlap with absolute Back button */}
                          <h1 className="text-4xl font-bold mb-4 text-center mt-6 sm:mt-0">{t('Cartoon Submission')}</h1>
                <div className="bg-white p-8 rounded-2xl shadow-xl text-left">
  <h2 className="text-2xl font-semibold text-black mb-4 text-center">
    {t('Instructions') || (language === 'kn' ? 'ಸೂಚನೆಗಳು' : 'Instructions')}
  </h2>
  <ul className="list-disc list-outside space-y-2 text-black text-base leading-relaxed">
    <li>
      {t('cartoon_quality_related') || 
        (language === 'kn' 
          ? 'ಕಾರ್ಟೂನ್ ಚಿತ್ರವು ಗುಣಮಟ್ಟದ ಕಾರ್ಯಗಳಿಗೆ ಸಂಬಂಧಿಸಿದಿರಬೇಕು.' 
          : 'The cartoon drawing should be related to Quality functions.')}
    </li>
    <li>
      {t('drawing_size') || 
        (language === 'kn' 
          ? 'ಚಿತ್ರವು A3 ಅಥವಾ A4 ಗಾತ್ರದ ಕಾಗದದಲ್ಲಿ ಇರಬೇಕು. ಯಾವುದೇ ರೀತಿಯ ಚಿತ್ರ (ಉದಾ: ಪೆನ್ಸಿಲ್ ಚಿತ್ರ, ವಾಟರ್‌ಕಲರ್ ಇತ್ಯಾದಿ) ಸ್ವೀಕಾರಾರ್ಹ.' 
          : 'The drawing should be on A3 or A4 size paper. Any type of drawing is accepted (e.g., pencil sketch, watercolor, etc.).')}
    </li>
    <li>
      {t('unique_idea') || 
        (language === 'kn' 
          ? 'ಪ್ರಶಸ್ತಿ ಆಯ್ಕೆಗೆ ವಿಶಿಷ್ಟವಾದ ಕಲ್ಪನೆಗೆ ಆದ್ಯತೆ ನೀಡಲಾಗುತ್ತದೆ.' 
          : 'A unique idea is preferred for prize selection.')}
    </li>
    <li>
      {t('file_size') || 
        (language === 'kn' 
          ? 'ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಚಿತ್ರದ ಗಾತ್ರವು 500KB ಕ್ಕಿಂತ ಕಡಿಮೆ ಇರಬೇಕು.' 
          : 'The uploaded image file must be less than 500 KB.')}
    </li>
    <li>
      {t('submit_hardcopy') || 
        (language === 'kn' 
          ? 'ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ನಂತರ, ದಯವಿಟ್ಟು ಹಾರ್ಡ್ ಕಾಪಿಯನ್ನು ಗುಣಮಟ್ಟ ಎಂಜಿನಿಯರಿಂಗ್ ತಂಡಕ್ಕೆ ಸಲ್ಲಿಸಿ.' 
          : 'After submitting the image on the portal, kindly submit a hard copy to the Quality Engineering team.')}
    </li>
    <li>
      {t('points_reward') || 
        (language === 'kn' 
          ? 'ಚಿತ್ರವನ್ನು ಸಲ್ಲಿಸಿದ ನಂತರ ನಿಮ್ಮ ಖಾತೆಗೆ 5 ಅಂಕಗಳು ಸೇರಿಸಲಾಗುತ್ತದೆ.' 
          : 'Upon submission, 5 points will be added to your account.')}
    </li>
    <li>
      {t('special_recognition') || 
        (language === 'kn' 
          ? 'ಈ ವಿಭಾಗಕ್ಕೆ ಪ್ರತ್ಯೇಕ Top-3 ವಿಶೇಷ ಗೌರವ ನೀಡಲಾಗುತ್ತದೆ.' 
          : 'This category will have a separate Top-3 special recognition.')}
    </li>
  </ul>
</div>


                 <div className="mt-8 bg-white p-8 rounded-2xl shadow-xl">
                     {!isCloudinaryConfigured && (
                        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                            <span className="font-medium">{t('configuration_needed')}</span> {language === 'kn' ? 'ಈ ವೈಶಿಷ್ಟ್ಯ ಆಕ್ಷೇಪ್ಯವಾಗಿದೆ. ದಯವಿಟ್ಟು README.md ರಲ್ಲಿ Cloudinary ಸೆಟಪ್ ಸೂಚಿಗಳನ್ನು ಅನುಸರಿಸಿ.' : 'This feature is disabled. Please follow the Cloudinary setup instructions in the `README.md` file.'}
                        </div>
                     )}
                    <label htmlFor="file-upload" className="cursor-pointer w-full flex flex-col items-center justify-center border-2 border-dashed border-black rounded-lg p-6 hover:bg-gray-100 transition-colors">
                         <svg className="w-10 h-10 mb-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <p key={language} className="mb-2 text-sm text-black"><span className="font-semibold">{t('click_to_upload')}</span> {t('or_drag_and_drop')}</p>
                        <p className="text-xs text-black">{t('png_jpg_gif')}</p>
                     </label>
                     <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                     
                     {preview && (
                         <div className="mt-6 text-center">
                            <h3 className="text-lg font-semibold">{t('image_preview')}</h3>
                            <div className="mt-2 w-full flex justify-center">
                             {/* Preview: constrain height to avoid overflow on small screens */}
                             <img
                                 src={preview}
                                 alt="Image preview"
                                 className="w-full h-auto max-w-full sm:max-w-sm mx-auto rounded-lg shadow-md object-contain max-h-[60vh]"
                             />
                            </div>
                         </div>
                     )}
                     
                    {file && <p className="mt-2 text-sm text-center text-black">{language === 'kn' ? `ಆಯ್ದವ: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` : `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`}</p>}

                     {error && <p className="mt-4 text-red-500 text-center">{error}</p>}

                     <button
                         onClick={handleSubmit}
                         disabled={!file || loading || !isCloudinaryConfigured}
                         className="mt-6 w-full flex justify-center items-center gap-2 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                     >
                        {loading ? (
                            <>
                                <Spinner />
                                <span>{t('uploading')}</span>
                            </>
                        ) : (
                            t('submit_image')
                        )}
                     </button>
                 </div>
             </div>
         </div>
     );
 };

export default ImageSubmissionTask;