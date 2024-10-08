import { StyledInputProps } from "@/utils/types";

const StyledInput: React.FC<StyledInputProps> = ({
  label,
  type,
  id,
  width,
}) => {
  return (
    <>
      <label htmlFor={id} className="text-xl pb-0 mb-0">
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        className={`m-0 p-2 text-amber-500 ring-amber-400 bg-slate-600 rounded-lg ${width} hover:ring-2 outline-amber-500`}
      />
    </>
  );
};

export default StyledInput;
