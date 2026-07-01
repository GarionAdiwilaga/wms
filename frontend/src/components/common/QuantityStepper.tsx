import { Button } from "../ui/button";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useRef, useEffect, useCallback } from "react";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  id?: string;
  name?: string;
  disabled?: boolean;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  id,
  name,
  disabled = false,
}: QuantityStepperProps) {
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalSpeed = useRef<number>(300);

  const stopPress = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
    intervalSpeed.current = 300;
  }, []);

  useEffect(() => {
    return stopPress;
  }, [stopPress]);

  const handleAction = useCallback((isIncrement: boolean) => {
    let nextVal = isIncrement ? valueRef.current + 1 : valueRef.current - 1;
    if (!isIncrement && nextVal < min) nextVal = min;
    if (isIncrement && max !== undefined && nextVal > max) nextVal = max;
    if (nextVal !== valueRef.current) {
      onChange(nextVal);
    }
    return nextVal;
  }, [min, max, onChange]);

  const startPress = useCallback((isIncrement: boolean) => {
    if (disabled) return;
    
    // Initial click
    handleAction(isIncrement);
    
    // Hold to repeat
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(function tick() {
        const nextVal = handleAction(isIncrement);
        if (nextVal === min || (max !== undefined && nextVal === max)) {
          stopPress();
          return;
        }
        
        // speed up incrementally to max 10/sec (100ms)
        if (intervalSpeed.current > 100) {
           intervalSpeed.current -= 50;
           clearInterval(intervalRef.current!);
           intervalRef.current = setInterval(tick, intervalSpeed.current);
        }
      }, intervalSpeed.current);
    }, 400); // 400ms delay before repeating
  }, [handleAction, min, max, stopPress, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) {
      onChange(min);
    } else {
      let nextVal = val;
      if (nextVal < min) nextVal = min;
      if (max !== undefined && nextVal > max) nextVal = max;
      onChange(nextVal);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
      <motion.div whileTap={{ scale: disabled || value <= min ? 1 : 0.85 }}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={() => startPress(false)}
          onMouseUp={stopPress}
          onMouseLeave={stopPress}
          onTouchStart={() => startPress(false)}
          onTouchEnd={stopPress}
          className="h-8 w-8 text-slate-400 hover:text-white rounded-md"
          disabled={disabled || value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
      </motion.div>
      
      {name && <label htmlFor={id} className="sr-only">Jumlah {name}</label>}
      <input
        id={id}
        name={name}
        type="number"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        min={min}
        max={max}
        className="bg-transparent text-white w-12 text-center text-sm font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <motion.div whileTap={{ scale: disabled || (max !== undefined && value >= max) ? 1 : 0.85 }}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onMouseDown={() => startPress(true)}
          onMouseUp={stopPress}
          onMouseLeave={stopPress}
          onTouchStart={() => startPress(true)}
          onTouchEnd={stopPress}
          className="h-8 w-8 text-slate-400 hover:text-white rounded-md"
          disabled={disabled || (max !== undefined && value >= max)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
