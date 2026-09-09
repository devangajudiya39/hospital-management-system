import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  FaHospital,
  FaLanguage,
  FaVolumeHigh,
  FaVolumeXmark,
  FaArrowRight,
  FaHeartPulse,
  FaShieldHeart,
  FaCheck
} from 'react-icons/fa6';

import './kiosk.css';
import KioskNavbar from './components/KioskNavbar';


const languages = [
  {
    code: 'en',
    name: 'English',
    speechCode: 'en-IN'
  },
  {
    code: 'hi',
    name: 'हिन्दी',
    speechCode: 'hi-IN'
  },
  {
    code: 'gu',
    name: 'ગુજરાતી',
    speechCode: 'gu-IN'
  }
];


const content = {

  en: {
    welcome: 'Welcome to MultiSpecialist Hospital',
    subtitle: 'Your health journey starts here.',
    description:
      'We will guide you through a few simple questions before your consultation.',
    hear: 'Hear Instructions',
    stop: 'Stop Instructions',
    start: 'Start Consultation',
    tap: 'Tap the button to begin',
    protected: 'Your information is protected',
    language: 'Language',
    selectLanguage: 'Select Your Language'
  },

  hi: {
    welcome: 'मल्टीस्पेशलिस्ट अस्पताल में आपका स्वागत है',
    subtitle: 'आपकी स्वास्थ्य यात्रा यहाँ से शुरू होती है।',
    description:
      'परामर्श शुरू करने से पहले हम आपसे कुछ आसान सवाल पूछेंगे।',
    hear: 'निर्देश सुनें',
    stop: 'निर्देश रोकें',
    start: 'परामर्श शुरू करें',
    tap: 'शुरू करने के लिए बटन दबाएँ',
    protected: 'आपकी जानकारी सुरक्षित है',
    language: 'भाषा',
    selectLanguage: 'अपनी भाषा चुनें'
  },

  gu: {
    welcome: 'મલ્ટીસ્પેશ્યાલિસ્ટ હોસ્પિટલમાં આપનું સ્વાગત છે',
    subtitle: 'તમારી આરોગ્ય યાત્રા અહીંથી શરૂ થાય છે.',
    description:
      'પરામર્શ શરૂ કરતા પહેલા અમે તમને થોડા સરળ પ્રશ્નો પૂછીશું.',
    hear: 'સૂચનાઓ સાંભળો',
    stop: 'સૂચનાઓ બંધ કરો',
    start: 'પરામર્શ શરૂ કરો',
    tap: 'શરૂ કરવા માટે બટન દબાવો',
    protected: 'તમારી માહિતી સુરક્ષિત છે',
    language: 'ભાષા',
    selectLanguage: 'તમારી ભાષા પસંદ કરો'
  }

};


const speechText = {

  en:
    'Welcome to MultiSpecialist Hospital. We will guide you through a few simple questions before your consultation. Press Start Consultation when you are ready.',

  hi:
    'मल्टीस्पेशलिस्ट अस्पताल में आपका स्वागत है। परामर्श शुरू करने से पहले हम आपसे कुछ आसान सवाल पूछेंगे। जब आप तैयार हों, तो परामर्श शुरू करें बटन दबाएँ।',

  gu:
    'મલ્ટીસ્પેશ્યાલિસ્ટ હોસ્પિટલમાં આપનું સ્વાગત છે. પરામર્શ શરૂ કરતા પહેલા અમે તમને થોડા સરળ પ્રશ્નો પૂછીશું. જ્યારે તમે તૈયાર હોવ ત્યારે પરામર્શ શરૂ કરો બટન દબાવો.'

};


function KioskHome() {

  const navigate = useNavigate();

  const [language, setLanguage] = useState('en');
  const [showLanguages, setShowLanguages] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);


  /*
   * Load browser voices.
   *
   * Chrome may initially return an empty array,
   * so we listen for the voiceschanged event.
   */

  useEffect(() => {

    if (!('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      const availableVoices =
        window.speechSynthesis.getVoices();

      setVoices(availableVoices);

      console.log(
        'Available speech voices:',
        availableVoices.map(
          voice => `${voice.name} - ${voice.lang}`
        )
      );
    };

    loadVoices();

    window.speechSynthesis.addEventListener(
      'voiceschanged',
      loadVoices
    );

    return () => {

      window.speechSynthesis.cancel();

      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        loadVoices
      );

    };

  }, []);


  /*
   * Find the best voice for the selected language.
   */

  const getVoiceForLanguage = (speechCode) => {

    if (!voices.length) {
      return null;
    }

    // Exact match first
    let voice = voices.find(
      voice =>
        voice.lang.toLowerCase() ===
        speechCode.toLowerCase()
    );

    if (voice) {
      return voice;
    }

    // Match language only
    const languagePrefix =
      speechCode.split('-')[0].toLowerCase();

    voice = voices.find(
      voice =>
        voice.lang
          .toLowerCase()
          .startsWith(languagePrefix)
    );

    return voice || null;
  };


  const speakInstructions = () => {

    if (!('speechSynthesis' in window)) {

      alert(
        'Audio instructions are not supported by this browser.'
      );

      return;
    }


    window.speechSynthesis.cancel();


    const selectedLanguage =
      languages.find(
        item => item.code === language
      );


    const voice =
      getVoiceForLanguage(
        selectedLanguage.speechCode
      );


    /*
     * If no voice exists for the selected language,
     * don't silently speak English.
     */

    if (!voice) {

      alert(
        `A ${selectedLanguage.name} voice is not available on this device.`
      );

      console.warn(
        `No voice available for ${selectedLanguage.speechCode}`
      );

      return;
    }


    const speech =
      new SpeechSynthesisUtterance(
        speechText[language]
      );


    speech.voice = voice;

    speech.lang =
      selectedLanguage.speechCode;

    speech.rate = 0.8;

    speech.pitch = 1;


    speech.onstart = () => {
      setIsSpeaking(true);
    };


    speech.onend = () => {
      setIsSpeaking(false);
    };


    speech.onerror = (event) => {

      console.error(
        'Speech synthesis error:',
        event
      );

      setIsSpeaking(false);

    };


    window.speechSynthesis.speak(speech);

  };


  const stopInstructions = () => {

    window.speechSynthesis.cancel();

    setIsSpeaking(false);

  };


  const selectLanguage = (code) => {

    window.speechSynthesis.cancel();

    setIsSpeaking(false);

    setLanguage(code);

    setShowLanguages(false);

  };


  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const patientId = location.state?.patientId || localStorage.getItem("hmsPatientId") || user.patientId || null;

  const startConsultation = () => {
    // D3: Navigate to consent page first — clinical session only begins after explicit consent
    navigate('/kiosk/consent', {
      state: {
        patientId,
        language,
        assessmentType: 'modern'
      }
    });
  };


  const currentContent =
    content[language];


  return (

    <div className="kiosk-page">

      {/* Decorative background */}

      <div className="kiosk-decoration kiosk-decoration-one"></div>

      <div className="kiosk-decoration kiosk-decoration-two"></div>


      {/* HEADER */}
      <KioskNavbar
        topBarTag="Touch-Mode Patient Consultation"
        rightAction={
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-bold rounded-xl text-sm transition-all cursor-pointer"
            onClick={() => setShowLanguages(!showLanguages)}
            aria-label="Select language"
          >
            <FaLanguage className="text-base" />
            <span>{currentContent.language}</span>
          </button>
        }
      />


      {/* LANGUAGE PANEL */}

      {showLanguages && (

        <div className="kiosk-language-panel">

          <div className="language-panel-header">

            <FaLanguage />

            <h2>
              {currentContent.selectLanguage}
            </h2>

          </div>


          <div className="language-options">

            {languages.map(item => (

              <button
                key={item.code}
                className={
                  language === item.code
                    ? 'language-option active'
                    : 'language-option'
                }
                onClick={() =>
                  selectLanguage(item.code)
                }
              >

                <span>
                  {item.name}
                </span>

                {language === item.code && (
                  <FaCheck />
                )}

              </button>

            ))}

          </div>

        </div>

      )}


      {/* MAIN */}

      <main className="kiosk-main">

        <div className="kiosk-content">


          {/* Medical icon */}

          <div className="kiosk-heart-icon">

            <FaHeartPulse />

          </div>


          {/* Heading */}

          <div className="kiosk-heading">

            <span className="kiosk-eyebrow">
              PATIENT ASSISTANCE
            </span>


            <h2>
              {currentContent.welcome}
            </h2>


            <h3>
              {currentContent.subtitle}
            </h3>

          </div>


          {/* Description */}

          <p className="kiosk-description">

            {currentContent.description}

          </p>


          {/* AUDIO */}

          {!isSpeaking ? (

            <button
              className="kiosk-audio-button"
              onClick={speakInstructions}
            >

              <span className="kiosk-audio-icon">

                <FaVolumeHigh />

              </span>

              <span>
                {currentContent.hear}
              </span>

            </button>

          ) : (

            <button
              className="kiosk-audio-button speaking"
              onClick={stopInstructions}
            >

              <span className="kiosk-audio-icon">

                <FaVolumeXmark />

              </span>

              <span>
                {currentContent.stop}
              </span>

            </button>

          )}


          {/* START CONSULTATION */}

          <button
            className="kiosk-start-button"
            onClick={startConsultation}
          >

            <span>
              {currentContent.start}
            </span>

            <FaArrowRight />

          </button>


          <p className="kiosk-tap-hint">

            {currentContent.tap}

          </p>


          {/* TRUST */}

          <div className="kiosk-trust">

            <div>

              <FaShieldHeart />

              <span>
                {currentContent.protected}
              </span>

            </div>


            <div>

              <FaCheck />

              <span>
                Secure consultation
              </span>

            </div>

          </div>

        </div>

      </main>


      {/* FOOTER */}

      <footer className="kiosk-footer">

        <span>
          © 2026 MultiSpecialist Hospital
        </span>

        <span className="footer-divider">
          |
        </span>

        <span>
          Patient Assistance
        </span>

      </footer>

    </div>

  );

}


export default KioskHome;