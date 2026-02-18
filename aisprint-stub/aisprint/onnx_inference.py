"""
Functional stub for aisprint.onnx_inference.

Replicates the load_and_inference interface used by the object-detector
component: separates model inputs from passthrough data, runs ONNX
inference, and returns (passthrough_dict, model_outputs).
"""

import onnxruntime


def load_and_inference(onnx_model_path, input_dict):
    """
    Load an ONNX model and run inference.

    Parameters
    ----------
    onnx_model_path : str
        Path to the .onnx model file.
    input_dict : dict
        Dictionary containing:
        - Keys matching ONNX model input names -> actual tensor data
        - Extra keys (e.g. "image_source") -> passed through in return_dict
        - "keep" -> control flag, not passed through

    Returns
    -------
    return_dict : dict
        Non-model-input entries from input_dict (excluding "keep").
    outputs : list
        Raw ONNX model outputs.
    """
    session = onnxruntime.InferenceSession(onnx_model_path)

    # Identify which keys are actual model inputs
    model_input_names = {inp.name for inp in session.get_inputs()}

    model_inputs = {}
    return_dict = {}

    for key, value in input_dict.items():
        if key in model_input_names:
            model_inputs[key] = value
        elif key != "keep":
            return_dict[key] = value

    # Run inference
    outputs = session.run(None, model_inputs)

    return return_dict, outputs
