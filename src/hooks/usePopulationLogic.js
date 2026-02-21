import { useState, useEffect, useRef, useMemo } from 'react'
import { COUNTRY_METADATA, seededRand } from '../countryMetadata'

const GLOBAL_STATS = {
  birthsPerSecond: 4.013,
  deathsPerSecond: 2.021,
  initialPopulation: 8261000000,
}
const YEAR_START = new Date(2026, 0, 1, 0, 0, 0)
const DEATH_CAUSE_WEIGHTS = {
  infectious: 0.185,
  childrenUnder5: 0.108,
  cancer: 0.116,
  malaria: 0.006,
  smoking: 0.071,
  alcohol: 0.035,
  suicide: 0.015,
  roadAccidents: 0.019,
  hivAids: 0.024,
  flu: 0.007,
  mothers: 0.004,
  other: 0, // will be filled to remainder by normalize
}
const EXTRA_RATES = {
  cigarettesPerSecond: 317000,
  illegalDrugsMoneyPerSecond: 25000,
}
const normalizeWeights = (w) => {
  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1
  const r = {}
  Object.keys(w).forEach((k) => {
    r[k] = w[k] / sum
  })
  return r
}
const computeBreakdown = (total, wNorm) => {
  const keys = Object.keys(wNorm)
  const out = {}
  let acc = 0
  keys.forEach((k) => {
    const v = Math.floor(total * wNorm[k])
    out[k] = v
    acc += v
  })
  const rem = total - acc
  if (rem > 0) {
    const target =
      wNorm.other !== undefined
        ? 'other'
        : keys.reduce((m, k) => (wNorm[k] > wNorm[m] ? k : m), keys[0])
    out[target] += rem
  }
  return out
}
const WEIGHTS_NORM = normalizeWeights(DEATH_CAUSE_WEIGHTS)

const getInitialStats = () => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const elapsedSeconds = (now.getTime() - startOfDay.getTime()) / 1000
  const birthsInit = Math.floor(elapsedSeconds * GLOBAL_STATS.birthsPerSecond)
  const deathsInit = Math.floor(elapsedSeconds * GLOBAL_STATS.deathsPerSecond)
  const cigarettesInit = Math.floor(elapsedSeconds * EXTRA_RATES.cigarettesPerSecond)
  const illegalMoneyInit = Math.floor(
    elapsedSeconds * EXTRA_RATES.illegalDrugsMoneyPerSecond
  )
  const elapsedYearSeconds = Math.max(0, (now.getTime() - YEAR_START.getTime()) / 1000)
  const birthsYearInit = Math.floor(elapsedYearSeconds * GLOBAL_STATS.birthsPerSecond)
  const deathsYearInit = Math.floor(elapsedYearSeconds * GLOBAL_STATS.deathsPerSecond)
  return {
    total: Math.floor(GLOBAL_STATS.initialPopulation + birthsYearInit - deathsYearInit),
    birthsToday: birthsInit,
    deathsToday: deathsInit,
    birthsYear: birthsYearInit,
    deathsYear: deathsYearInit,
    viabilityIndex:
      GLOBAL_STATS.birthsPerSecond /
      (GLOBAL_STATS.birthsPerSecond + GLOBAL_STATS.deathsPerSecond),
    healthStats: {
      today: computeBreakdown(deathsInit, WEIGHTS_NORM),
      year: computeBreakdown(deathsYearInit, WEIGHTS_NORM),
    },
    cigarettesToday: cigarettesInit,
    illegalDrugsMoneyToday: illegalMoneyInit,
  }
}

export const usePopulationLogic = (opts = {}) => {
  const [stats, setStats] = useState(() => getInitialStats())

  const preciseData = useRef({
    births: 0,
    deaths: 0,
    cigarettes: 0,
    illegalMoney: 0,
  })
  const lastInts = useRef({
    births: 0,
    deaths: 0,
    cigarettes: 0,
    illegalMoney: 0,
  })
  const POP_WORLD = useMemo(() => GLOBAL_STATS.initialPopulation, [])
  const TZ_BY_ISO = useMemo(
    () => ({
      CN: 8,
      IN: 5.5,
      US: -5,
      ID: 7,
      PK: 5,
      BR: -3,
      NG: 1,
      BD: 6,
      RU: 3,
      JP: 9,
    }),
    []
  )
  const countryPrecise = useRef({})
  const countryLastInts = useRef({})
  const lastIsoPulseAt = useRef({})
  const jitterSeeds = useRef({})
  const onBirthPulse = useMemo(
    () => (typeof opts.onBirthPulse === 'function' ? opts.onBirthPulse : () => {}),
    [opts.onBirthPulse]
  )
  const onDeathPulse = useMemo(
    () => (typeof opts.onDeathPulse === 'function' ? opts.onDeathPulse : () => {}),
    [opts.onDeathPulse]
  )
  const onBirthPulseISO = useMemo(
    () =>
      typeof opts.onBirthPulseISO === 'function' ? opts.onBirthPulseISO : () => {},
    [opts.onBirthPulseISO]
  )
  const onDeathPulseISO = useMemo(
    () =>
      typeof opts.onDeathPulseISO === 'function' ? opts.onDeathPulseISO : () => {},
    [opts.onDeathPulseISO]
  )
  const randLatLng = () => ({
    lat: -85 + Math.random() * 170,
    lng: -180 + Math.random() * 360,
  })

  useEffect(() => {
    const init = getInitialStats()
    preciseData.current.births = init.birthsToday
    preciseData.current.deaths = init.deathsToday
    preciseData.current.cigarettes = init.cigarettesToday
    preciseData.current.illegalMoney = init.illegalDrugsMoneyToday
    lastInts.current.births = init.birthsToday
    lastInts.current.deaths = init.deathsToday
    lastInts.current.cigarettes = init.cigarettesToday
    lastInts.current.illegalMoney = init.illegalDrugsMoneyToday
    const nowUtc = Date.now()
    const jitterStart = {}
    Object.keys(COUNTRY_METADATA).forEach((iso) => {
      const tz = TZ_BY_ISO[iso] || 0
      const localNow = new Date(nowUtc + tz * 3600000)
      const sod = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate())
      const elapsedLocal = Math.max(0, (localNow.getTime() - sod.getTime()) / 1000)
      const microOffset = Math.random() * 0.8
      jitterStart[iso] = microOffset
      const meta = COUNTRY_METADATA[iso]
      const share = meta?.population ? meta.population / POP_WORLD : 0.0005
      const bps =
        GLOBAL_STATS.birthsPerSecond *
        share *
        (meta?.birthRateFactor || 1)
      const dps =
        GLOBAL_STATS.deathsPerSecond *
        share *
        (meta?.deathRateFactor || 1)
      const bInit = Math.floor((elapsedLocal + microOffset) * bps)
      const dInit = Math.floor((elapsedLocal + microOffset) * dps)
      countryPrecise.current[iso] = { births: bInit, deaths: dInit }
      countryLastInts.current[iso] = { births: bInit, deaths: dInit }
    })
    jitterSeeds.current = jitterStart
    const tickRate = 50
    const timer = setInterval(() => {
      const incrementB = (GLOBAL_STATS.birthsPerSecond * tickRate) / 1000
      const incrementD = (GLOBAL_STATS.deathsPerSecond * tickRate) / 1000
      const incrementC = (EXTRA_RATES.cigarettesPerSecond * tickRate) / 1000
      const incrementIM = (EXTRA_RATES.illegalDrugsMoneyPerSecond * tickRate) / 1000
      preciseData.current.births += incrementB
      preciseData.current.deaths += incrementD
      preciseData.current.cigarettes += incrementC
      preciseData.current.illegalMoney += incrementIM
      const ratio = incrementB / (incrementB + incrementD)
      const bInt = Math.floor(preciseData.current.births)
      const dInt = Math.floor(preciseData.current.deaths)
      const cInt = Math.floor(preciseData.current.cigarettes)
      const imInt = Math.floor(preciseData.current.illegalMoney)
      const nowTick = Date.now()
      const elapsedYearSecondsTick = Math.max(0, (nowTick - YEAR_START.getTime()) / 1000)
      const bYearInt = Math.floor(elapsedYearSecondsTick * GLOBAL_STATS.birthsPerSecond)
      const dYearInt = Math.floor(elapsedYearSecondsTick * GLOBAL_STATS.deathsPerSecond)
      let changed = false
      if (bInt > lastInts.current.births) {
        const times = bInt - lastInts.current.births
        lastInts.current.births = bInt
        for (let i = 0; i < times; i++) {
          const p = randLatLng()
          onBirthPulse(p.lat, p.lng)
        }
        changed = true
      }
      if (dInt > lastInts.current.deaths) {
        const times = dInt - lastInts.current.deaths
        lastInts.current.deaths = dInt
        for (let i = 0; i < times; i++) {
          const p = randLatLng()
          onDeathPulse(p.lat, p.lng)
        }
        changed = true
      }
      if (cInt > lastInts.current.cigarettes) {
        lastInts.current.cigarettes = cInt
        changed = true
      }
      if (imInt > lastInts.current.illegalMoney) {
        lastInts.current.illegalMoney = imInt
        changed = true
      }
      const countryOut = {}
      const jitterAmp = 0.2
      const tSec = Math.floor(nowTick / 1000)
      Object.keys(COUNTRY_METADATA).forEach((iso) => {
        const meta = COUNTRY_METADATA[iso]
        const share = meta?.population ? meta.population / POP_WORLD : 0.0005
        const bps =
          GLOBAL_STATS.birthsPerSecond *
          share *
          (meta?.birthRateFactor || 1)
        const dps =
          GLOBAL_STATS.deathsPerSecond *
          share *
          (meta?.deathRateFactor || 1)
        const jb = 1 + jitterAmp * (seededRand(iso, tSec, 17) - 0.5)
        const jd = 1 + jitterAmp * (seededRand(iso, tSec, 53) - 0.5)
        countryPrecise.current[iso].births += (bps * tickRate * jb) / 1000
        countryPrecise.current[iso].deaths += (dps * tickRate * jd) / 1000
        const bC = Math.floor(countryPrecise.current[iso].births)
        const dC = Math.floor(countryPrecise.current[iso].deaths)
        if (bC > countryLastInts.current[iso].births) {
          countryLastInts.current[iso].births = bC
          const now = Date.now()
          const last = lastIsoPulseAt.current[iso]?.birth || 0
          if (now - last > 200) {
            lastIsoPulseAt.current[iso] = {
              ...(lastIsoPulseAt.current[iso] || {}),
              birth: now,
            }
            onBirthPulseISO(iso)
          }
          changed = true
        }
        if (dC > countryLastInts.current[iso].deaths) {
          countryLastInts.current[iso].deaths = dC
          const now = Date.now()
          const last = lastIsoPulseAt.current[iso]?.death || 0
          if (now - last > 200) {
            lastIsoPulseAt.current[iso] = {
              ...(lastIsoPulseAt.current[iso] || {}),
              death: now,
            }
            onDeathPulseISO(iso)
          }
          changed = true
        }
        countryOut[iso] = { birthsToday: bC, deathsToday: dC }
      })
      if (changed) {
        setStats({
          total: Math.floor(GLOBAL_STATS.initialPopulation + bYearInt - dYearInt),
          birthsToday: bInt,
          deathsToday: dInt,
          birthsYear: bYearInt,
          deathsYear: dYearInt,
          viabilityIndex: ratio,
          healthStats: {
            today: computeBreakdown(dInt, WEIGHTS_NORM),
            year: computeBreakdown(dYearInt, WEIGHTS_NORM),
          },
          cigarettesToday: cInt,
          illegalDrugsMoneyToday: imInt,
          countryStats: countryOut,
        })
      }
    }, tickRate)
    return () => clearInterval(timer)
  }, [onBirthPulse, onDeathPulse, onBirthPulseISO, onDeathPulseISO, POP_WORLD, TZ_BY_ISO])

  const getCountryInstant = useMemo(
    () => (iso) => {
      const meta = COUNTRY_METADATA[iso]
      if (!meta) return null
      const obj = countryPrecise.current[iso]
      if (!obj) return null
      return { birthsToday: Math.floor(obj.births), deathsToday: Math.floor(obj.deaths) }
    },
    []
  )
  return { ...stats, getCountryInstant }
}
