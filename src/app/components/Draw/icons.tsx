export function PenIcon({ className, color }) {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0_1539_179)">
        <g clip-path="url(#clip1_1539_179)">
          <path
            d="M7.99556 10.0703C8.19978 9.56757 8.68826 9.23877 9.23085 9.23877H14.7692C15.3118 9.23877 15.8003 9.56757 16.0045 10.0703L19.2157 17.9747C19.7337 19.2498 20.0001 20.6131 20.0001 21.9895V45.2389H4V21.9895C4 20.6131 4.26635 19.2498 4.78436 17.9747L7.99556 10.0703Z"
            fill="white"
          />
          <path
            d="M7.99556 10.0703C8.19978 9.56757 8.68826 9.23877 9.23085 9.23877H14.7692C15.3118 9.23877 15.8003 9.56757 16.0045 10.0703L19.2157 17.9747C19.7337 19.2498 20.0001 20.6131 20.0001 21.9895V45.2389H4V21.9895C4 20.6131 4.26635 19.2498 4.78436 17.9747L7.99556 10.0703Z"
            fill="url(#paint0_linear_1539_179)"
            fill-opacity="0.6"
          />
          <path
            d="M9.23047 9.48877H14.7695C15.1552 9.48887 15.5071 9.6934 15.7002 10.0181L15.7725 10.1645L18.9844 18.0688C19.4902 19.314 19.75 20.6457 19.75 21.9897V44.9888H4.25V21.9897C4.25 20.6457 4.50979 19.314 5.01562 18.0688L8.22754 10.1645C8.39342 9.75622 8.78976 9.48892 9.23047 9.48877Z"
            stroke="black"
            stroke-opacity="0.3"
            stroke-width="0.5"
          />
          <g opacity="0.2" filter="url(#filter0_f_1539_179)">
            <path
              d="M18.6635 20.6615V44.3282H12.3301V10.3281L14.6634 10.2388L18.6635 20.6615Z"
              fill="url(#paint1_linear_1539_179)"
            />
          </g>
          <g filter="url(#filter1_i_1539_179)">
            <path
              d="M11.383 3.74726C11.6089 3.19493 12.3911 3.19493 12.6171 3.74725L15 9.57232H9L11.383 3.74726Z"
              fill={color || "#1E1E1E"}
            />
          </g>
          <path
            d="M11.6143 3.84158C11.7556 3.49681 12.2444 3.49682 12.3857 3.84158L14.6279 9.32205H9.37207L11.6143 3.84158Z"
            stroke="black"
            stroke-opacity="0.3"
            stroke-width="0.5"
          />
          <path
            d="M4.33008 23.9058H19.6635"
            stroke="black"
            stroke-opacity="0.15"
            stroke-width="0.66667"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_f_1539_179"
          x="10.3301"
          y="8.23875"
          width="10.3335"
          height="38.0894"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="1.00001"
            result="effect1_foregroundBlur_1539_179"
          />
        </filter>
        <filter
          id="filter1_i_1539_179"
          x="7.55999"
          y="3.33301"
          width="7.44001"
          height="6.95926"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="-1.44001" dy="0.720004" />
          <feGaussianBlur stdDeviation="1.08001" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect1_innerShadow_1539_179"
          />
        </filter>
        <linearGradient
          id="paint0_linear_1539_179"
          x1="4"
          y1="38.2389"
          x2="20.0001"
          y2="38.2389"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-opacity="0.1" />
          <stop offset="0.4" stop-opacity="0" />
          <stop offset="1" stop-opacity="0.15" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_1539_179"
          x1="12.3301"
          y1="1.57206"
          x2="17.1673"
          y2="36.2341"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-opacity="0.2" />
          <stop offset="1" stop-opacity="0.4" />
        </linearGradient>
        <clipPath id="clip0_1539_179">
          <rect width="24" height="24" fill="white" />
        </clipPath>
        <clipPath id="clip1_1539_179">
          <rect
            width="16"
            height="34"
            fill="white"
            transform="translate(4 2.57227)"
          />
        </clipPath>
      </defs>
    </svg>
  );
}

export function MarkerIcon({ className, color }) {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clip-path="url(#clip0_1538_150)">
        <path
          d="M7.95337 5.71142C7.95337 5.36004 8.16295 5.04253 8.48605 4.9044L13.7522 2.65314C14.3313 2.40559 14.9748 2.83041 14.9748 3.46017L14.9748 10.9073L7.95337 10.9073L7.95337 5.71142Z"
          fill={color || "#FFEE00"}
        />
        <path
          d="M7.95337 5.71142C7.95337 5.36004 8.16295 5.04253 8.48605 4.9044L13.7522 2.65314C14.3313 2.40559 14.9748 2.83041 14.9748 3.46017L14.9748 10.9073L7.95337 10.9073L7.95337 5.71142Z"
          fill="url(#paint0_linear_1538_150)"
        />
        <path
          d="M14.0947 2.62097C14.4884 2.45264 14.9256 2.74131 14.9259 3.16947L14.9259 10.9171L8.00098 10.9171L8.00098 5.61955L8.00798 5.53139C8.03836 5.32877 8.17118 5.15321 8.36338 5.07104L14.0947 2.62097Z"
          stroke="black"
          stroke-opacity="0.3"
          stroke-width="0.1"
        />
        <path
          d="M8.21993 10.3188C7.31667 10.3188 6.58444 11.0468 6.58444 11.9446C6.58444 17.2642 4.51919 21.2529 0.638381 24.8865C0.238494 25.2609 0.000244048 25.7803 0.000244045 26.3283L0.000244012 31.8114C0.000244008 32.6027 0.641734 33.2442 1.43307 33.2444L21.4927 33.2444C22.2841 33.2444 22.9255 32.6029 22.9255 31.8115L22.9255 26.3283C22.9255 25.7805 22.6873 25.2611 22.2874 24.8867C18.4065 21.253 16.3414 17.2643 16.3414 11.9447C16.3414 11.0469 15.6091 10.3189 14.7059 10.3189L8.21993 10.3188Z"
          fill="url(#paint1_linear_1538_150)"
          fill-opacity="0.6"
        />
        <path
          d="M8.24279 10.6406C7.34604 10.6406 6.61908 11.3633 6.61908 12.2547C6.61908 17.536 4.56869 21.496 0.715818 25.1035C0.31881 25.4752 0.0822753 25.9908 0.0822753 26.5348L0.0822753 31.9784C0.0822753 32.7641 0.719147 33.4009 1.50478 33.4011L21.42 33.4011C22.2057 33.4011 22.8425 32.7642 22.8425 31.9786L22.8425 26.5348C22.8425 25.991 22.606 25.4753 22.2089 25.1036C18.3561 21.4961 16.3058 17.5361 16.3058 12.2548C16.3058 11.3634 15.5788 10.6407 14.682 10.6407L8.24279 10.6406Z"
          fill="white"
        />
        <path
          d="M8.22911 10.9165L14.716 10.9165C15.4232 10.9167 15.9935 11.4863 15.9935 12.1842C15.9935 17.6193 18.1121 21.6982 22.0522 25.3875C22.3839 25.698 22.5768 26.1242 22.5769 26.567L22.5769 32.0507C22.5769 32.6442 22.0958 33.1253 21.5023 33.1253L1.44278 33.1253L1.33224 33.1197C0.790689 33.0643 0.368164 32.6068 0.368164 32.0507L0.368164 26.567C0.368322 26.1795 0.516175 25.8049 0.775344 25.5093L0.892879 25.3875C4.83304 21.6982 6.95297 17.6193 6.95299 12.1842C6.95299 11.5297 7.45337 10.9885 8.09898 10.9235L8.22911 10.9165Z"
          stroke="black"
          stroke-opacity="0.3"
          stroke-width="0.5"
        />
        <g opacity="0.1" filter="url(#filter0_f_1538_150)">
          <path
            d="M15.2885 12.2295L11.9453 12.2295L11.9453 31.8116L21.4975 31.8116L21.4975 26.0801C18.6319 23.2145 15.2885 20.8266 15.2885 12.2295Z"
            fill="black"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_f_1538_150"
          x="9.94529"
          y="10.2295"
          width="13.5523"
          height="23.5821"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="1.00001"
            result="effect1_foregroundBlur_1538_150"
          />
        </filter>
        <linearGradient
          id="paint0_linear_1538_150"
          x1="11.4641"
          y1="3.00812"
          x2="11.4641"
          y2="8.71307"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="white" stop-opacity="0.8" />
          <stop offset="1" stop-color="white" stop-opacity="0" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_1538_150"
          x1="0.000244031"
          y1="28.7867"
          x2="22.9255"
          y2="28.7867"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-opacity="0.1" />
          <stop offset="0.4" stop-opacity="0" />
          <stop offset="1" stop-opacity="0.15" />
        </linearGradient>
        <clipPath id="clip0_1538_150">
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
